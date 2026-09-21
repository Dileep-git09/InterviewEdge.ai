const MockInterview = require("../models/MockInterview");
const User = require("../models/User");
const { redisClient } = require("../config/redis");
const { normaliseRole, escapeRegExp } = require("./topQuestionController");

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard — best completed-mock score per user for a role, ranked.
//
// Named + on by default (per product decision), with a per-user opt-out
// (User.leaderboardOptOut). Opting out only hides you from OTHERS' view of
// the named list — you still count toward the total/percentile math, and you
// can always see your own rank. That's "don't show my name", not "pretend I
// don't exist in the stats".
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_TTL = 60 * 10; // 10 min — doesn't need to be real-time

// "Asha Kapoor" -> "Asha K." (matches the testimonial format already used on
// the landing page) — a privacy-conscious middle ground for a leaderboard
// that's on by default.
const maskName = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "Anonymous";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

const getCache = async (key) => {
  try {
    if (!redisClient.isReady) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("Leaderboard Redis GET error:", err.message);
    return null;
  }
};

const setCache = async (key, data) => {
  try {
    if (!redisClient.isReady) return;
    await redisClient.setEx(key, REDIS_TTL, JSON.stringify(data));
  } catch (err) {
    console.error("Leaderboard Redis SET error:", err.message);
  }
};

// Cached as { userId, score } pairs only — no names — so one cache entry is
// reusable across every requester and never goes stale just because someone
// changes their display name or opt-out preference.
const getRankedScores = async (role) => {
  const cacheKey = `leaderboard:ranked:${role}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const exactRoleRegex = new RegExp(`^${escapeRegExp(role)}$`, "i");
  const mocks = await MockInterview.find({
    status: "completed",
    overallScore: { $ne: null },
    role: { $regex: exactRoleRegex },
  })
    .select("user overallScore")
    .lean();

  const bestByUser = new Map();
  for (const m of mocks) {
    const uid = m.user.toString();
    const prev = bestByUser.get(uid);
    if (prev === undefined || m.overallScore > prev) bestByUser.set(uid, m.overallScore);
  }

  const ranked = [...bestByUser.entries()]
    .map(([userId, score]) => ({ userId, score }))
    .sort((a, b) => b.score - a.score);

  await setCache(cacheKey, ranked);
  return ranked;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/leaderboard?role=&limit=
// ─────────────────────────────────────────────────────────────────────────────
exports.getLeaderboard = async (req, res) => {
  try {
    const role = normaliseRole(req.query.role || "");
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    if (!role) {
      return res.status(400).json({ message: "role query parameter is required" });
    }

    const ranked = await getRankedScores(role);
    const total = ranked.length;

    const myId = req.user._id.toString();
    const myIndex = ranked.findIndex((r) => r.userId === myId);
    const you =
      myIndex === -1
        ? null
        : {
            rank: myIndex + 1,
            score: ranked[myIndex].score,
            totalParticipants: total,
            // % of participants you scored better than (0 when you're the only one).
            percentile: total > 1 ? Math.round(((total - (myIndex + 1)) / (total - 1)) * 100) : 0,
          };

    // Pad past `limit` in case some top scorers have opted out — heuristic,
    // not a guarantee of exactly `limit` results if opt-outs run deep.
    const candidateIds = ranked.slice(0, limit + 20).map((r) => r.userId);
    const users = await User.find({ _id: { $in: candidateIds } })
      .select("name leaderboardOptOut")
      .lean();
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    const leaderboard = [];
    for (let i = 0; i < ranked.length && leaderboard.length < limit; i++) {
      const entry = ranked[i];
      const user = userById.get(entry.userId);
      if (!user || user.leaderboardOptOut) continue;
      leaderboard.push({
        rank: i + 1,
        name: maskName(user.name),
        score: entry.score,
        isYou: entry.userId === myId,
      });
    }

    res.status(200).json({ role, total, leaderboard, you });
  } catch (error) {
    console.error("Error fetching leaderboard:", error.message);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};
