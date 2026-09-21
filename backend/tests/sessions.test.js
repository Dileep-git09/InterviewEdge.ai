const request = require("supertest");
const app = require("../app");

const registerAndGetToken = async (email) => {
  const res = await request(app).post("/api/v1/auth/register").send({
    name: "User", email, password: "Password123",
  });
  return { token: res.body.token, userId: res.body._id };
};

const createSession = (token, overrides = {}) =>
  request(app)
    .post("/api/v1/sessions/create")
    .set("Authorization", `Bearer ${token}`)
    .send({
      role: "Frontend Developer",
      experience: "2",
      topicsToFocus: "React",
      description: "test session",
      questions: [{ question: "Q1", answer: "A1" }],
      ...overrides,
    });

describe("POST /api/v1/sessions/create", () => {
  it("creates a session with questions", async () => {
    const { token } = await registerAndGetToken("owner@example.com");
    const res = await createSession(token);
    expect(res.status).toBe(201);
    expect(res.body.session.questions).toHaveLength(1);
  });

  it("rejects a non-array questions field with 400 (not a 500 + orphaned session)", async () => {
    const { token } = await registerAndGetToken("owner@example.com");
    const res = await createSession(token, { questions: "not-an-array" });
    expect(res.status).toBe(400);
  });
});

describe("session ownership", () => {
  it("returns 403 when getting another user's session", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const intruder = await registerAndGetToken("intruder@example.com");
    const created = await createSession(owner.token);
    const sessionId = created.body.session._id;

    const res = await request(app)
      .get(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${intruder.token}`);
    expect(res.status).toBe(403);
  });

  it("returns 403 when deleting another user's session", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const intruder = await registerAndGetToken("intruder@example.com");
    const created = await createSession(owner.token);
    const sessionId = created.body.session._id;

    const res = await request(app)
      .delete(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${intruder.token}`);
    expect(res.status).toBe(403);

    // Confirm it's still there — the delete really was blocked, not silently ok'd
    const stillThere = await request(app)
      .get(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(stillThere.status).toBe(200);
  });

  it("the owner can get and delete their own session", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const created = await createSession(owner.token);
    const sessionId = created.body.session._id;

    const getRes = await request(app)
      .get(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(getRes.status).toBe(200);

    const delRes = await request(app)
      .delete(`/api/v1/sessions/${sessionId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(delRes.status).toBe(200);
  });
});

describe("GET /api/v1/sessions/my-sessions pagination", () => {
  it("paginates with no overlap between pages and an accurate total", async () => {
    const { token } = await registerAndGetToken("owner@example.com");
    for (let i = 0; i < 5; i++) await createSession(token, { description: `session ${i}` });

    const page1 = await request(app)
      .get("/api/v1/sessions/my-sessions?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);
    const page2 = await request(app)
      .get("/api/v1/sessions/my-sessions?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`);
    const page3 = await request(app)
      .get("/api/v1/sessions/my-sessions?page=3&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(page1.body.sessions).toHaveLength(2);
    expect(page2.body.sessions).toHaveLength(2);
    expect(page3.body.sessions).toHaveLength(1);
    expect(page1.body.total).toBe(5);
    expect(page1.body.totalPages).toBe(3);

    const idsP1 = page1.body.sessions.map((s) => s._id);
    const idsP2 = page2.body.sessions.map((s) => s._id);
    expect(idsP1.some((id) => idsP2.includes(id))).toBe(false);
  });

  it("caps limit at 50 even when a larger value is requested", async () => {
    const { token } = await registerAndGetToken("owner@example.com");
    const res = await request(app)
      .get("/api/v1/sessions/my-sessions?limit=9999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.limit).toBe(50);
  });

  it("only returns the requesting user's own sessions", async () => {
    const owner = await registerAndGetToken("owner@example.com");
    const other = await registerAndGetToken("other@example.com");
    await createSession(owner.token);
    await createSession(other.token);

    const res = await request(app)
      .get("/api/v1/sessions/my-sessions")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.body.total).toBe(1);
  });
});
