const request = require("supertest");
const crypto = require("crypto");
const app = require("../app");
const User = require("../models/User");
const Session = require("../models/Session");

const register = (overrides = {}) =>
  request(app).post("/api/v1/auth/register").send({
    name: "Test User",
    email: "test@example.com",
    password: "Password123",
    ...overrides,
  });

describe("POST /api/v1/auth/register", () => {
  it("creates a user and returns a token", async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.email).toBe("test@example.com");
  });

  it("rejects a duplicate email with 409", async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
  });

  it("rejects a short password with 400", async () => {
    const res = await register({ password: "abc" });
    expect(res.status).toBe(400);
  });

  it("rejects a malformed email with 400", async () => {
    const res = await register({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => register());

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "Password123" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects a wrong password with the same generic message as unknown email (no enumeration)", async () => {
    const wrongPassRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "WrongPassword" });
    const unknownEmailRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "WrongPassword" });

    expect(wrongPassRes.status).toBe(401);
    expect(unknownEmailRes.status).toBe(401);
    expect(wrongPassRes.body.message).toBe(unknownEmailRes.body.message);
  });
});

describe("protect middleware", () => {
  it("rejects a request with no token", async () => {
    const res = await request(app).get("/api/v1/auth/profile");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed/invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });

  it("accepts a valid token", async () => {
    const { body } = await register();
    const res = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("test@example.com");
  });
});

describe("token revocation (tokenVersion)", () => {
  it("change-password invalidates the old token but the freshly-returned one still works", async () => {
    const { body: regBody } = await register();
    const oldToken = regBody.token;

    const changeRes = await request(app)
      .put("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${oldToken}`)
      .send({ currentPassword: "Password123", newPassword: "NewPassword456" });
    expect(changeRes.status).toBe(200);
    const newToken = changeRes.body.token;
    expect(newToken).toBeDefined();
    expect(newToken).not.toBe(oldToken);

    const oldTokenCheck = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${oldToken}`);
    expect(oldTokenCheck.status).toBe(401);

    const newTokenCheck = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${newToken}`);
    expect(newTokenCheck.status).toBe(200);
  });

  it("logout-all invalidates even the token used to call it", async () => {
    const { body } = await register();
    const token = body.token;

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const check = await request(app)
      .get("/api/v1/auth/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(check.status).toBe(401);
  });
});

describe("forgot-password / reset-password", () => {
  it("forgot-password returns the same generic message whether or not the email exists", async () => {
    await register();
    const existing = await request(app).post("/api/v1/auth/forgot-password").send({ email: "test@example.com" });
    const nonExisting = await request(app).post("/api/v1/auth/forgot-password").send({ email: "nobody@example.com" });

    expect(existing.status).toBe(200);
    expect(nonExisting.status).toBe(200);
    expect(existing.body.message).toBe(nonExisting.body.message);
  });

  it("stores only a hash of the reset token, never the raw token", async () => {
    await register();
    await request(app).post("/api/v1/auth/forgot-password").send({ email: "test@example.com" });

    const user = await User.findOne({ email: "test@example.com" }).select("+resetPasswordTokenHash");
    expect(user.resetPasswordTokenHash).toBeTruthy();
    expect(user.resetPasswordTokenHash).toHaveLength(64); // sha256 hex
  });

  it("resets the password with a valid token and logs the user in", async () => {
    await register();

    // Reach into the DB the same way the controller does, since the raw
    // token only ever exists in the (unsent, dev-mode-logged) email.
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await User.updateOne(
      { email: "test@example.com" },
      { resetPasswordTokenHash: tokenHash, resetPasswordExpires: new Date(Date.now() + 60000) }
    );

    const res = await request(app)
      .post(`/api/v1/auth/reset-password/${rawToken}`)
      .send({ newPassword: "BrandNewPassword789" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "BrandNewPassword789" });
    expect(login.status).toBe(200);
  });

  it("rejects an invalid/expired token", async () => {
    await register();
    const res = await request(app)
      .post("/api/v1/auth/reset-password/not-a-real-token")
      .send({ newPassword: "BrandNewPassword789" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/export", () => {
  it("returns the user's profile and owned data", async () => {
    const { body } = await register();
    await Session.create({
      user: body._id, role: "Dev", experience: "1", topicsToFocus: "JS",
    });

    const res = await request(app)
      .get("/api/v1/auth/export")
      .set("Authorization", `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.profile.email).toBe("test@example.com");
    expect(res.body.sessions).toHaveLength(1);
  });
});

describe("DELETE /api/v1/auth/account", () => {
  it("requires the correct password", async () => {
    const { body } = await register();
    const res = await request(app)
      .delete("/api/v1/auth/account")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: "WrongPassword" });
    expect(res.status).toBe(401);
  });

  it("deletes the account and its sessions on correct password", async () => {
    const { body } = await register();
    await Session.create({ user: body._id, role: "Dev", experience: "1", topicsToFocus: "JS" });

    const res = await request(app)
      .delete("/api/v1/auth/account")
      .set("Authorization", `Bearer ${body.token}`)
      .send({ password: "Password123" });
    expect(res.status).toBe(200);

    expect(await User.findById(body._id)).toBeNull();
    expect(await Session.find({ user: body._id })).toHaveLength(0);
  });
});
