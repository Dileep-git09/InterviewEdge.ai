const request = require("supertest");
const app = require("../app");

const registerAndGetToken = async (email) => {
  const res = await request(app).post("/api/v1/auth/register").send({
    name: "User", email, password: "Password123",
  });
  return { token: res.body.token };
};

const createSessionWithQuestion = async (token) => {
  const res = await request(app)
    .post("/api/v1/sessions/create")
    .set("Authorization", `Bearer ${token}`)
    .send({
      role: "Frontend Developer", experience: "2", topicsToFocus: "React",
      questions: [{ question: "What is a closure?", answer: "..." }],
    });
  return {
    sessionId: res.body.session._id,
    questionId: res.body.session.questions[0],
  };
};

describe("question ownership", () => {
  it("returns 403 when pinning a question in another user's session", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const intruder = await registerAndGetToken("intruder@example.com");
    const { questionId } = await createSessionWithQuestion(owner.token);

    const res = await request(app)
      .post(`/api/v1/questions/${questionId}/pin`)
      .set("Authorization", `Bearer ${intruder.token}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 when adding a note to another user's question", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const intruder = await registerAndGetToken("intruder@example.com");
    const { questionId } = await createSessionWithQuestion(owner.token);

    const res = await request(app)
      .post(`/api/v1/questions/${questionId}/note`)
      .set("Authorization", `Bearer ${intruder.token}`)
      .send({ note: "sneaky" });
    expect(res.status).toBe(403);
  });

  it("returns 403 when adding questions to another user's session", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const intruder = await registerAndGetToken("intruder@example.com");
    const { sessionId } = await createSessionWithQuestion(owner.token);

    const res = await request(app)
      .post("/api/v1/questions/add")
      .set("Authorization", `Bearer ${intruder.token}`)
      .send({ sessionId, questions: [{ question: "Q2", answer: "A2" }] });
    expect(res.status).toBe(403);
  });

  it("the owner can pin their own question", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const { questionId } = await createSessionWithQuestion(owner.token);

    const res = await request(app)
      .post(`/api/v1/questions/${questionId}/pin`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.question.isPinned).toBe(true);
  });
});
