const TopQuestion = require("../models/TopQuestion");
const { redisClient } = require("../config/redis");

// ─────────────────────────────────────────────────────────────────────────────
// normaliseRole
//
// Maps user-typed role strings to a consistent lowercase key so that
// "React Developer", "react developer", and "REACT DEVELOPER" all hit
// the same cache entry and the same MongoDB documents.
// ─────────────────────────────────────────────────────────────────────────────
const normaliseRole = (role = "") =>
  role.toLowerCase().trim().replace(/\s+/g, " ");

// Escapes regex metacharacters so a role like "C++ Developer" or "UI/UX (Lead)"
// can't produce an invalid pattern (e.g. a bare "+") or unintended matching.
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─────────────────────────────────────────────────────────────────────────────
// Cache helpers (Upstash Redis)
// ─────────────────────────────────────────────────────────────────────────────
const REDIS_TTL = 60 * 60; // 1 hour

const getCache = async (key) => {
  try {
    if (!redisClient.isReady) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("Redis GET error:", err.message);
    return null;
  }
};

const setCache = async (key, data) => {
  try {
    if (!redisClient.isReady) return;
    await redisClient.setEx(key, REDIS_TTL, JSON.stringify(data));
  } catch (err) {
    console.error("Redis SET error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/top-questions?role=frontend+developer&limit=10
//
// Returns the top questions for a role, sorted by score descending.
//
// Caching layers:
//   1. Cloudflare CDN (or any CDN) — Cache-Control header lets the CDN cache
//      this response at the edge for 1 hour. Users in the same region get a
//      ~10ms response with zero backend involvement.
//   2. Upstash Redis — if the CDN misses, Redis returns in ~5ms.
//   3. MongoDB — only hit on a cold cache (first request after 1 hour).
// ─────────────────────────────────────────────────────────────────────────────
const getTopQuestions = async (req, res) => {
  try {
    const role  = normaliseRole(req.query.role || "");
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    if (!role) {
      return res.status(400).json({ message: "role query parameter is required" });
    }

    const cacheKey = `top:questions:${role}:${limit}`;

    // ── Layer 2: Redis ────────────────────────────────────────────────────
    const cached = await getCache(cacheKey);
    if (cached) {
      return res
        .status(200)
        .set("X-Cache", "HIT")
        // Layer 1: CDN cache header
        // s-maxage=3600          — CDN caches for 1 hour
        // stale-while-revalidate — serve stale while fetching fresh in background
        .set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
        .json({ role, source: "cache", questions: cached });
    }

    // ── Layer 3: MongoDB ──────────────────────────────────────────────────
    // Fuzzy role match: find documents whose role contains the query string.
    // This means "frontend developer" also matches "senior frontend developer".
    const roleRegex = new RegExp(role.split(" ").map(escapeRegExp).join("|"), "i");

    const questions = await TopQuestion.find({
      role: { $regex: roleRegex },
    })
      .sort({ score: -1 })
      .limit(limit)
      .select("question answer score source tags uniqueUserPins -_id")
      .lean();

    if (!questions.length) {
      return res
        .status(200)
        .set("Cache-Control", "public, s-maxage=300") // 5 min cache for empty results
        .json({ role, source: "db", questions: [] });
    }

    // Store in Redis
    await setCache(cacheKey, questions);

    return res
      .status(200)
      .set("X-Cache", "MISS")
      .set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
      .json({ role, source: "db", questions });
  } catch (error) {
    console.error("Error fetching top questions:", error.message);
    res.status(500).json({ message: "Failed to fetch top questions" });
  }
};

module.exports = { getTopQuestions, normaliseRole, escapeRegExp };