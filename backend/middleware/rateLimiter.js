// ─────────────────────────────────────────────────────────────────────────────
// aiRateLimiter — lightweight in-memory fixed-window limiter (no new dependency).
//
// Keyed by the authenticated user id when available (so it must run AFTER the
// `protect` middleware), falling back to IP for any unauthenticated traffic.
//
// Defaults: 30 requests / 15 minutes. Override with env vars:
//   AI_RATE_LIMIT_MAX, AI_RATE_LIMIT_WINDOW_MS
//
// NOTE: state lives in this process's memory — perfect for a single instance.
// If you later run multiple instances behind a load balancer, swap the Map for
// your existing Redis client (config/redis.js) so the window is shared.
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_MS = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const MAX = parseInt(process.env.AI_RATE_LIMIT_MAX) || 30;

const hits = new Map(); // key -> { count, resetAt }

const aiRateLimiter = (req, res, next) => {
  const key =
    (req.user && req.user._id ? `u:${req.user._id}` : `ip:${req.ip}`) || "anon";
  const now = Date.now();

  let entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    hits.set(key, entry);
  }

  entry.count += 1;

  res.set("X-RateLimit-Limit", String(MAX));
  res.set("X-RateLimit-Remaining", String(Math.max(MAX - entry.count, 0)));

  if (entry.count > MAX) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: `Too many AI requests. Please try again in ${retryAfter}s.`,
    });
  }

  next();
};

// Periodically drop expired entries so the Map never grows unbounded.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
}, 10 * 60 * 1000);
cleanup.unref?.(); // don't keep the process alive just for cleanup

// ─────────────────────────────────────────────────────────────────────────────
// makeLimiter — generic fixed-window limiter factory (separate bucket per name).
// Used for brute-force protection on auth endpoints.
// ─────────────────────────────────────────────────────────────────────────────
const makeLimiter = ({ name, windowMs, max, message }) => {
  const bucket = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of bucket) if (now > v.resetAt) bucket.delete(k);
  }, windowMs);
  sweep.unref?.();

  return (req, res, next) => {
    const key = `${name}:${req.ip}`;
    const now = Date.now();
    let entry = bucket.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      bucket.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
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
