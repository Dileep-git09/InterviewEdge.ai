require("dotenv").config();

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const compression = require("compression");
const multer      = require("multer");
const mongoose    = require("mongoose");

const connectDB = require("./config/db");
const { connectRedis, redisClient } = require("./config/redis");
const { startTopQuestionsCron } = require("./jobs/aggregateTopQuestions");
const { seedTopQuestions } = require("./seeds/topQuestionSeeds");

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
app.use("/api/auth",          authRoutes);
app.use("/api/sessions",      sessionRoutes);
app.use("/api/questions",     questionRoutes);
app.use("/api/top-questions", topQuestionRoutes); // public — CDN cacheable
app.use("/api/mock",          mockInterviewRoutes);

// AI routes — authenticated + per-user rate limited (protects the AI quota)
app.post("/api/ai/generate-questions",   protect, aiRateLimiter, generateInterviewQuestions);
app.post("/api/ai/generate-explanation", protect, aiRateLimiter, generateConceptExplanation);
app.post("/api/ai/generate-from-resume", protect, aiRateLimiter, resumeUpload.single("resume"), generateQuestionsFromResume);

// ── 404 + centralized error handler (must be last) ───────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
let server;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();      // non-fatal if Redis is unreachable
    await seedTopQuestions();  // upsert-safe
    startTopQuestionsCron();

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Fatal startup error:", err);
    process.exit(1);
  }
};

// ── Graceful shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  try {
    if (server) await new Promise((r) => server.close(r));
    await mongoose.connection.close();
    if (redisClient?.isReady) await redisClient.quit();
    console.log("Cleanup complete. Bye.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};
["SIGTERM", "SIGINT"].forEach((sig) => process.on(sig, () => shutdown(sig)));

// ── Last-resort safety nets (log, don't crash silently) ──────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // An uncaught exception leaves the process in an undefined state — exit so the
  // platform (PM2 / Render / Docker) can restart a clean instance.
  shutdown("uncaughtException");
});

startServer();
