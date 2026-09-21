const request = require("supertest");
const app = require("../app");
const TopQuestion = require("../models/TopQuestion");

describe("GET /api/v1/top-questions", () => {
  it("requires a role query param", async () => {
    const res = await request(app).get("/api/v1/top-questions");
    expect(res.status).toBe(400);
  });

  it("returns questions for a plain role", async () => {
    await TopQuestion.create({
      role: "frontend developer", question: "What is the virtual DOM?", answer: "...", score: 50,
    });
    const res = await request(app).get("/api/v1/top-questions?role=frontend+developer");
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
  });

  it("does not 500 on roles containing regex metacharacters (regression: C++ Developer)", async () => {
    await TopQuestion.create({
      role: "c++ developer", question: "Explain RAII.", answer: "...", score: 50,
    });
    const res = await request(app).get(`/api/v1/top-questions?role=${encodeURIComponent("C++ Developer")}`);
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });

  it("does not 500 on other regex-special roles either", async () => {
    for (const role of ["UI/UX (Lead) Designer", "C# Developer", "Data Scientist [ML]"]) {
      const res = await request(app).get(`/api/v1/top-questions?role=${encodeURIComponent(role)}`);
      expect(res.status).toBe(200);
    }
  });

  it("fuzzy-matches multi-word roles (e.g. finds 'senior frontend developer' pins)", async () => {
    await TopQuestion.create({
      role: "senior frontend developer", question: "What is reconciliation?", answer: "...", score: 60,
    });
    const res = await request(app).get("/api/v1/top-questions?role=frontend+developer");
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBeGreaterThan(0);
  });
});
