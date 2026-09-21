const { redisClient } = require("../config/redis");

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting — Redis-backed when available, in-memory fallback otherwise.
//
// The in-memory Map only limits within a single process; behind a load
// balancer with multiple instances, each instance would enforce its own
// separate limit, letting a client get MAX requests per instance instead of
// MAX total. Redis's atomic INCR + PEXPIRE gives one shared counter across
// every instance. When Redis is unreachable (or a call fails mid-request),
// this falls straight back to the in-memory counter — same "non-fatal when
// Redis is down" pattern used everywhere else in this codebase (config/redis.js,
// controller/topQuestionController.js's cache helpers).
// ─────────────────────────────────────────────────────────────────────────────

// Redis fixed-window counter: INCR returns the new count; on the first hit
// (count === 1) we just created the key, so set its TTL to the window length.
const redisHit = async (key, windowMs) => {
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.pExpire(key, windowMs);
  }
  const ttl = await redisClient.pTTL(key);
  return { count, resetInMs: ttl > 0 ? ttl : windowMs };
};

// In-memory fixed-window counter (per bucket Map, cleaned up periodically).
const makeMemoryHit = (bucket) => (key, windowMs) => {
  const now = Date.now();
  let entry = bucket.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    bucket.set(key, entry);
  }
  entry.count += 1;
  return { count: entry.count, resetInMs: entry.resetAt - now };
};

const applyLimitHeaders = (res, max, count, resetInMs) => {
  res.set("X-RateLimit-Limit", String(max));
  res.set("X-RateLimit-Remaining", String(Math.max(max - count, 0)));
  if (count > max) res.set("Retry-After", String(Math.ceil(resetInMs / 1000)));
};

// ─────────────────────────────────────────────────────────────────────────────
// aiRateLimiter — per user (or IP if unauthenticated).
// Defaults: 30 requests / 15 minutes. Override with env vars:
//   AI_RATE_LIMIT_MAX, AI_RATE_LIMIT_WINDOW_MS
// ─────────────────────────────────────────────────────────────────────────────
const AI_WINDOW_MS = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const AI_MAX = parseInt(process.env.AI_RATE_LIMIT_MAX) || 30;
const aiMemoryBucket = new Map();
const aiMemoryHit = makeMemoryHit(aiMemoryBucket);

const aiRateLimiter = async (req, res, next) => {
  const key = (req.user && req.user._id ? `u:${req.user._id}` : `ip:${req.ip}`) || "anon";

  let result;
  if (redisClient.isReady) {
    try {
      result = await redisHit(`ratelimit:ai:${key}`, AI_WINDOW_MS);
    } catch (err) {
      console.error("aiRateLimiter Redis error, falling back to in-memory:", err.message);
    }
  }
  if (!result) result = aiMemoryHit(key, AI_WINDOW_MS);

  applyLimitHeaders(res, AI_MAX, result.count, result.resetInMs);
  if (result.count > AI_MAX) {
    const retryAfter = Math.ceil(result.resetInMs / 1000);
    return res.status(429).json({
      message: `Too many AI requests. Please try again in ${retryAfter}s.`,
    });
  }
  next();
};

// Periodically drop expired in-memory entries so the Map never grows unbounded.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of aiMemoryBucket) if (now > v.resetAt) aiMemoryBucket.delete(k);
}, 10 * 60 * 1000);
cleanup.unref?.(); // don't keep the process alive just for cleanup

// ─────────────────────────────────────────────────────────────────────────────
// makeLimiter — generic fixed-window limiter factory (separate bucket per name).
// Used for brute-force protection on auth endpoints.
// ─────────────────────────────────────────────────────────────────────────────
const makeLimiter = ({ name, windowMs, max, message }) => {
  const memoryBucket = new Map();
  const memoryHit = makeMemoryHit(memoryBucket);
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryBucket) if (now > v.resetAt) memoryBucket.delete(k);
  }, windowMs);
  sweep.unref?.();

  return async (req, res, next) => {
    const key = `${name}:${req.ip}`;

    let result;
    if (redisClient.isReady) {
      try {
        result = await redisHit(`ratelimit:${key}`, windowMs);
      } catch (err) {
        console.error(`${name} limiter Redis error, falling back to in-memory:`, err.message);
      }
    }
    if (!result) result = memoryHit(key, windowMs);

    if (result.count > max) {
      const retryAfter = Math.ceil(result.resetInMs / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: message || `Too many requests. Try again in ${retryAfter}s.` });
    }
    next();
  };
};

// Brute-force guard for login/register: 10 attempts / 15 min per IP.
const authLimiter = makeLimiter({
  name: "auth",
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

module.exports = { aiRateLimiter, makeLimiter, authLimiter };
