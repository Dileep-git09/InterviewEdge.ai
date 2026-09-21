require("dotenv").config();

const mongoose = require("mongoose");

const monitoring = require("./utils/monitoring");
monitoring.init(); // no-op unless SENTRY_DSN is set

const app = require("./app");
const connectDB = require("./config/db");
const { connectRedis, redisClient } = require("./config/redis");
const { startTopQuestionsCron } = require("./jobs/aggregateTopQuestions");
const { seedTopQuestions } = require("./seeds/topQuestionSeeds");

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
  monitoring.captureException(reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  monitoring.captureException(err);
  // An uncaught exception leaves the process in an undefined state — exit so the
  // platform (PM2 / Render / Docker) can restart a clean instance.
  shutdown("uncaughtException");
});

startServer();
