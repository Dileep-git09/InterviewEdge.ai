const request = require("supertest");
const app = require("../app");
const MockInterview = require("../models/MockInterview");

const register = (email, name = "Test User") =>
  request(app).post("/api/v1/auth/register").send({ name, email, password: "Password123" });

// Directly create a completed mock — bypasses the AI-dependent /mock/start
// flow (already covered, with Gemini mocked, in mock.test.js) so these tests
// can focus purely on the leaderboard aggregation logic.
const completedMock = (userId, role, overallScore) =>
  MockInterview.create({
    user: userId,
    role,
    difficulty: "medium",
    status: "completed",
    overallScore,
    questions: [{ question: "Q", idealAnswer: "A", answered: true, score: overallScore }],
  });

describe("GET /api/v1/leaderboard", () => {
  it("requires a role query param", async () => {
    const { body } = await register("a@example.com");
    const res = await request(app)
      .get("/api/v1/leaderboard")
      .set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(400);
  });

  it("ranks users by their best score, descending", async () => {
    const a = await register("a@example.com", "Asha Kapoor");
    const b = await register("b@example.com", "Bilal Khan");
    const c = await register("c@example.com", "Chen Wei");

    await completedMock(a.body._id, "Frontend Developer", 70);
    await completedMock(b.body._id, "Frontend Developer", 95);
    await completedMock(c.body._id, "Frontend Developer", 82);

    const res = await request(app)
      .get("/api/v1/leaderboard?role=Frontend+Developer")
      .set("Authorization", `Bearer ${a.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.leaderboard.map((e) => e.score)).toEqual([95, 82, 70]);
    expect(res.body.leaderboard[0].name).toBe("Bilal K."); // masked, "First L." format
  });

  it("only counts each user's BEST score, not every attempt", async () => {
    const a = await register("a@example.com", "Asha Kapoor");
    await completedMock(a.body._id, "Backend Developer", 40);
    await completedMock(a.body._id, "Backend Developer", 88);
    await completedMock(a.body._id, "Backend Developer", 60);

    const res = await request(app)
      .get("/api/v1/leaderboard?role=Backend+Developer")
      .set("Authorization", `Bearer ${a.body.token}`);

    expect(res.body.total).toBe(1); // one user, not three entries
    expect(res.body.leaderboard[0].score).toBe(88);
  });

  it("ignores in-progress and abandoned mocks", async () => {
    const a = await register("a@example.com");
    await MockInterview.create({
      user: a.body._id, role: "Data Scientist", difficulty: "medium",
      status: "in_progress", overallScore: null, questions: [],
    });

    const res = await request(app)
      .get("/api/v1/leaderboard?role=Data+Scientist")
      .set("Authorization", `Bearer ${a.body.token}`);
    expect(res.body.total).toBe(0);
    expect(res.body.you).toBeNull();
  });

  it("role matching is case-insensitive but exact (not fuzzy across roles)", async () => {
    const a = await register("a@example.com");
    await completedMock(a.body._id, "UI/UX Designer", 77);

    const hit = await request(app)
      .get("/api/v1/leaderboard?role=ui%2Fux+designer")
      .set("Authorization", `Bearer ${a.body.token}`);
    expect(hit.body.total).toBe(1);

    const miss = await request(app)
      .get("/api/v1/leaderboard?role=Senior+UI%2FUX+Designer")
      .set("Authorization", `Bearer ${a.body.token}`);
    expect(miss.body.total).toBe(0); // exact match only, unlike top-questions' fuzzy match
  });

  it("excludes opted-out users from the named list but still counts them toward total/percentile", async () => {
    const a = await register("a@example.com", "Asha Kapoor");
    const b = await register("b@example.com", "Bilal Khan");
    await completedMock(a.body._id, "Product Manager", 90);
    await completedMock(b.body._id, "Product Manager", 60);

    await request(app)
      .put("/api/v1/auth/leaderboard-preference")
      .set("Authorization", `Bearer ${a.body.token}`)
      .send({ optOut: true });

    const res = await request(app)
      .get("/api/v1/leaderboard?role=Product+Manager")
      .set("Authorization", `Bearer ${b.body.token}`);

    expect(res.body.total).toBe(2); // both still counted
    expect(res.body.leaderboard).toHaveLength(1); // only Bilal shown
    expect(res.body.leaderboard[0].name).toBe("Bilal K.");
    expect(res.body.leaderboard.some((e) => e.name.startsWith("Asha"))).toBe(false);
  });

  it("an opted-out user can still see their own rank", async () => {
    const a = await register("a@example.com", "Asha Kapoor");
    const b = await register("b@example.com", "Bilal Khan");
    await completedMock(a.body._id, "QA Engineer", 90);
    await completedMock(b.body._id, "QA Engineer", 60);

    await request(app)
      .put("/api/v1/auth/leaderboard-preference")
      .set("Authorization", `Bearer ${a.body.token}`)
      .send({ optOut: true });

    const res = await request(app)
      .get("/api/v1/leaderboard?role=QA+Engineer")
      .set("Authorization", `Bearer ${a.body.token}`);

    expect(res.body.you).toEqual({ rank: 1, score: 90, totalParticipants: 2, percentile: 100 });
  });

  it("computes 'you' correctly when not in the visible top list", async () => {
    const users = [];
    for (let i = 0; i < 5; i++) {
      users.push(await register(`u${i}@example.com`, `User ${i}`));
      await completedMock(users[i].body._id, "DevOps Engineer", 90 - i * 5); // 90,85,80,75,70
    }
    const last = users[4]; // score 70, rank 5 of 5

    const res = await request(app)
      .get("/api/v1/leaderboard?role=DevOps+Engineer&limit=2")
      .set("Authorization", `Bearer ${last.body.token}`);

    expect(res.body.leaderboard).toHaveLength(2); // limit respected
    expect(res.body.you.rank).toBe(5);
    expect(res.body.you.percentile).toBe(0); // last place beats no one
  });
});

describe("PUT /api/v1/auth/leaderboard-preference", () => {
  it("rejects a non-boolean value", async () => {
    const { body } = await register("a@example.com");
    const res = await request(app)
      .put("/api/v1/auth/leaderboard-preference")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ optOut: "yes" });
    expect(res.status).toBe(400);
  });

  it("persists the preference", async () => {
    const { body } = await register("a@example.com");
    await request(app)
      .put("/api/v1/auth/leaderboard-preference")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ optOut: true });

    const profile = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${body.token}`);
    expect(profile.body.leaderboardOptOut).toBe(true);
  });
});
