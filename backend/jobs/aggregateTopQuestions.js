const cron = require("node-cron");
const PinEvent = require("../models/PinEvent");
const TopQuestion = require("../models/TopQuestion");
const { redisClient } = require("../config/redis");

// ─────────────────────────────────────────────────────────────────────────────
// aggregateTopQuestions  (runs every hour via node-cron)
//
// Pipeline:
//   1. Group all PinEvents by role + question where pinned === true
//   2. Count unique users per group (= uniqueUserPins)
//   3. For each group, upsert a TopQuestion document:
//        - If it already exists (community or seeded): update uniqueUserPins + score
//        - If it's new: create with source "community"
//   4. Invalidate the Redis cache for affected roles so the next request
//      gets fresh data from MongoDB.
//
// Score formula:  score = baseScore + (uniqueUserPins × 10)
//   baseScore is preserved from the existing document (seed questions keep
//   their head start even as community data grows).
// ─────────────────────────────────────────────────────────────────────────────

const runAggregation = async () => {
  console.log("[TopQuestions Cron] Starting aggregation...");
  const start = Date.now();

  try {
    // ── Step 1: Aggregate PinEvents ──────────────────────────────────────
    const aggregated = await PinEvent.aggregate([
      { $match: { pinned: true } },
      {
        $group: {
          _id: { role: "$role", question: "$question" },
          // Count unique users who pinned this question for this role
          uniqueUsers: { $addToSet: "$user" },
          // Keep a sample answer (most recently pinned wins)
          answer: { $last: "$answer" },
        },
      },
      {
        $project: {
          role:           "$_id.role",
          question:       "$_id.question",
          answer:         1,
          uniqueUserPins: { $size: "$uniqueUsers" },
        },
      },
      // Only promote questions pinned by at least 1 user
      { $match: { uniqueUserPins: { $gte: 1 } } },
      // Process the most popular first
      { $sort: { uniqueUserPins: -1 } },
    ]);

    if (!aggregated.length) {
      console.log("[TopQuestions Cron] No pin data yet — skipping upsert.");
      return;
    }

    console.log(`[TopQuestions Cron] Processing ${aggregated.length} question groups...`);

    const affectedRoles = new Set();

    // ── Step 2: Upsert TopQuestion documents ─────────────────────────────
    for (const item of aggregated) {
      const existing = await TopQuestion.findOne({
        role: item.role,
        question: item.question,
      });

      const baseScore = existing?.baseScore ?? 0;
      const score     = baseScore + item.uniqueUserPins * 10;

      await TopQuestion.findOneAndUpdate(
        { role: item.role, question: item.question },
        {
          $set: {
            answer:         item.answer,
            uniqueUserPins: item.uniqueUserPins,
            score,
            source: existing?.source ?? "community",
          },
          $setOnInsert: { baseScore: 0, tags: [] },
        },
        { upsert: true, new: true }
      );

      affectedRoles.add(item.role);
    }

    // ── Step 3: Bust Redis cache for affected roles ───────────────────────
    if (redisClient.isReady && affectedRoles.size > 0) {
      for (const role of affectedRoles) {
        // Delete all limit variants for this role
        for (const limit of [5, 10, 15, 20]) {
          await redisClient.del(`top:questions:${role}:${limit}`);
        }
      }
      console.log(`[TopQuestions Cron] Cache busted for ${affectedRoles.size} roles.`);
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(
      `[TopQuestions Cron] Done. ${aggregated.length} groups processed in ${duration}s.`
    );
  } catch (err) {
    console.error("[TopQuestions Cron] Error during aggregation:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// startTopQuestionsCron
// Called once from server.js on startup.
// Runs the aggregation immediately on boot, then every hour.
// ─────────────────────────────────────────────────────────────────────────────
const startTopQuestionsCron = () => {
  // Run immediately on server start so data is fresh without waiting 1 hour
  runAggregation();

  // Then run every hour at :00
  cron.schedule("0 * * * *", () => {
    runAggregation();
  });

  console.log("[TopQuestions Cron] Scheduled — runs every hour.");
};

module.exports = { startTopQuestionsCron };