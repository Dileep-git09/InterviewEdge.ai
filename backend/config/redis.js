const { createClient } = require("redis");

// ─────────────────────────────────────────────────────────────────────────────
// Redis client — configured for Upstash.
//
// Upstash uses the rediss:// protocol (TLS). The two socket options below are
// required:
//   socket.tls: true         — enables TLS for the rediss:// connection
//   rejectUnauthorized: false — Upstash uses self-signed certs in some regions
//
// Graceful degradation: if Redis is unavailable, the app keeps working and
// falls back to calling Gemini directly. Every cache operation checks
// redisClient.isReady before executing so a missing Redis never crashes the
// server.
//
// reconnectStrategy caps retries at 3 — node-redis's default retries forever
// with no ceiling, which left connectRedis()'s `await redisClient.connect()`
// unresolved indefinitely whenever Upstash was unreachable, hanging the
// entire server boot (seeding, cron, and app.listen never ran). Bounding it
// lets the connect() promise reject so the try/catch below can actually do
// the "non-fatal" fallback the comment above promises.
// ─────────────────────────────────────────────────────────────────────────────

const redisClient = createClient({
  url: process.env.REDIS_URL, // e.g. rediss://default:xxx@xxx.upstash.io:6379
  socket: {
    tls: true,                  // required for Upstash (rediss:// protocol)
    rejectUnauthorized: false,  // Upstash uses self-signed certs in some regions
    reconnectStrategy: (retries) =>
      retries >= 3 ? new Error("Redis unreachable after 3 attempts") : Math.min(retries * 200, 1000),
  },
});

redisClient.on("connect", () => console.log("Upstash Redis connected"));
redisClient.on("ready",   () => console.log("Upstash Redis ready"));
redisClient.on("error",   (err) => console.error("Redis error:", err.message));
redisClient.on("end",     () => console.log("Redis disconnected"));

// Called once from server.js on startup — non-fatal if Upstash is unreachable
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Redis failed to connect:", err.message);
  }
};

module.exports = { redisClient, connectRedis };