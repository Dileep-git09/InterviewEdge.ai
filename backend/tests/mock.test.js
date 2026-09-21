// The mock-interview flow calls Gemini for question generation, per-answer
// grading, and the final debrief — mocked here so tests are fast,
// deterministic, and don't burn real API quota (per ENGINEERING_GUIDELINES.md
// §11: "AI helpers (mocked)").
jest.mock("../utils/gemini", () => ({
  ...jest.requireActual("../utils/gemini"), // keep the real normaliseQuestionsArray etc.
  callGeminiForJSON: jest.fn(),
}));

const request = require("supertest");
const app = require("../app");
const { callGeminiForJSON } = require("../utils/gemini");

const registerAndGetToken = async (email) => {
  const res = await request(app).post("/api/v1/auth/register").send({
    name: "User", email, password: "Password123",
  });
  return { token: res.body.token };
};

beforeEach(() => {
  callGeminiForJSON.mockReset();
});

describe("mock interview ownership", () => {
  it("returns 403 when another user tries to fetch someone else's mock attempt", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const intruder = await registerAndGetToken("intruder@example.com");

    callGeminiForJSON.mockResolvedValueOnce([
      { question: "What is a closure?", answer: "..." },
    ]);
    const start = await request(app)
      .post("/api/v1/mock/start")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ mode: "fresh", role: "Frontend Developer", numberOfQuestions: 1 });
    expect(start.status).toBe(201);
    const mockId = start.body.mock._id;

    const res = await request(app)
      .get(`/api/v1/mock/${mockId}`)
      .set("Authorization", `Bearer ${intruder.token}`);
    expect(res.status).toBe(403);
  });
});

describe("full mock interview flow (AI mocked)", () => {
  it("start -> answer -> complete works end to end", async () => {
    const { token } = await registerAndGetToken("owner@example.com");

    // 1. start — Gemini returns the question set
    callGeminiForJSON.mockResolvedValueOnce([
      { question: "What is a closure?", answer: "A function bound to its lexical scope." },
    ]);
    const start = await request(app)
      .post("/api/v1/mock/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "fresh", role: "Frontend Developer", numberOfQuestions: 1 });
    expect(start.status).toBe(201);
    const mockId = start.body.mock._id;
    expect(start.body.mock.total).toBe(1);

    // Ideal answer must NOT be visible before the question is answered.
    expect(start.body.mock.questions[0].idealAnswer).toBe("");

    // 2. answer — Gemini returns the evaluation
    callGeminiForJSON.mockResolvedValueOnce({
      score: 85, verdict: "Strong answer.", strengths: ["Clear"], improvements: [], missedPoints: [],
      modelAnswer: "A function bound to its lexical scope.",
    });
    const answer = await request(app)
      .post(`/api/v1/mock/${mockId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionIndex: 0, userAnswer: "It's a function with access to its outer scope.", timeTakenSec: 30 });
    expect(answer.status).toBe(200);
    expect(answer.body.evaluation.score).toBe(85);
    expect(answer.body.evaluation.idealAnswer).toBeTruthy(); // now revealed post-answer

    // 3. complete — Gemini returns the debrief
    callGeminiForJSON.mockResolvedValueOnce({
      overallVerdict: "Good", summary: "Nice work.", topStrengths: ["Clarity"], focusAreas: [],
    });
    const complete = await request(app)
      .post(`/api/v1/mock/${mockId}/complete`)
      .set("Authorization", `Bearer ${token}`);
    expect(complete.status).toBe(200);
    expect(complete.body.mock.status).toBe("completed");
    expect(complete.body.mock.overallScore).toBe(85);
  });

  it("submitting an empty answer marks it skipped without calling the AI", async () => {
    const { token } = await registerAndGetToken("owner@example.com");

    callGeminiForJSON.mockResolvedValueOnce([{ question: "Q1", answer: "A1" }]);
    const start = await request(app)
      .post("/api/v1/mock/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "fresh", role: "Backend Developer", numberOfQuestions: 1 });
    const mockId = start.body.mock._id;

    const answer = await request(app)
      .post(`/api/v1/mock/${mockId}/answer`)
      .set("Authorization", `Bearer ${token}`)
      .send({ questionIndex: 0, userAnswer: "", timeTakenSec: 5 });

    expect(answer.status).toBe(200);
    expect(answer.body.evaluation.skipped).toBe(true);
    // Only the one call from /start — /answer with an empty string must not
    // have called the AI a second time.
    expect(callGeminiForJSON).toHaveBeenCalledTimes(1);
  });
});
