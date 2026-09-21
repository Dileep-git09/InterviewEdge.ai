// ─────────────────────────────────────────────────────────────────────────────
// app.js — builds and exports the configured Express app, with no side
// effects beyond that (no DB/Redis connections, no listen(), no cron/seed).
//
// Split out from server.js so tests (and anything else) can import a fully
// wired app without booting the real infrastructure. server.js is the actual
// production entrypoint: it requires this file, then does the connect/seed/
// cron/listen/graceful-shutdown bootstrap.
// ─────────────────────────────────────────────────────────────────────────────

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const compression = require("compression");
const multer      = require("multer");
const mongoose    = require("mongoose");

const { redisClient } = require("./config/redis");

const authRoutes         = require("./routes/authRoutes");
const sessionRoutes      = require("./routes/sessionRoutes");
const questionRoutes     = require("./routes/questionRoutes");
const topQuestionRoutes  = require("./routes/topQuestionRoutes");
const mockInterviewRoutes = require("./routes/mockInterviewRoutes");
const { protect }       = require("./middleware/authMiddleware");
const { aiRateLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const {
  generateInterviewQuestions,
  generateConceptExplanation,
  generateQuestionsFromResume,
} = require("./controller/aiController");

const app = express();

// Trust the first proxy (needed for correct req.ip behind Render/Vercel/NGINX,
// which keeps the rate limiters keyed by the real client IP).
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── Gzip compression ─────────────────────────────────────────────────────────
app.use(compression());

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production, set FRONTEND_URL (comma-separated for multiple origins) to lock
// the API down to your own front end. With no value set (local dev), all origins
// are allowed for convenience.
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parser (with an explicit size limit) ────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Multer: in-memory storage for resume uploads ─────────────────────────────
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExt = ["pdf", "doc", "docx"];
    const ext = file.originalname.split(".").pop().toLowerCase();
    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF and Word documents are accepted."), false);
  },
});

// ── Health checks (for uptime monitors / load balancers) ─────────────────────
app.get("/", (_req, res) => res.status(200).json({ status: "ok", service: "InterviewEdge API" }));
app.get("/health", (_req, res) =>
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    redis: redisClient?.isReady ? "ready" : "down",
    timestamp: new Date().toISOString(),
  })
);

// ── Routes ───────────────────────────────────────────────────────────────────
// Versioned under /api/v1 so a future breaking change has somewhere to land
// without yanking the rug out from under whatever's still calling /api/v1.
const v1 = express.Router();

v1.use("/auth",          authRoutes);
v1.use("/sessions",      sessionRoutes);
v1.use("/questions",     questionRoutes);
v1.use("/top-questions", topQuestionRoutes); // public — CDN cacheable
v1.use("/mock",          mockInterviewRoutes);

// AI routes — authenticated + per-user rate limited (protects the AI quota)
v1.post("/ai/generate-questions",   protect, aiRateLimiter, generateInterviewQuestions);
v1.post("/ai/generate-explanation", protect, aiRateLimiter, generateConceptExplanation);
v1.post("/ai/generate-from-resume", protect, aiRateLimiter, resumeUpload.single("resume"), generateQuestionsFromResume);

app.use("/api/v1", v1);

// ── 404 + centralized error handler (must be last) ───────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
