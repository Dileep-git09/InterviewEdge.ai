const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────────
// TopQuestion
//
// Stores pre-aggregated "important questions" per role.
// Documents are either seeded (real-world) or promoted from community pins.
//
// Score formula:  score = baseScore + (uniqueUserPins × 10)
//   - Real-world seed questions start at baseScore 50 so they appear on day 1
//     even with zero community activity.
//   - Every unique user who pins a question for this role adds 10 to the score.
//   - The hourly cron job (jobs/aggregateTopQuestions.js) recalculates scores
//     and upserts documents.
// ─────────────────────────────────────────────────────────────────────────────

const topQuestionSchema = new mongoose.Schema(
  {
    // Normalised lowercase role name — used as the grouping key.
    // e.g. "frontend developer", "data scientist", "civil engineer"
    role: { type: String, required: true, index: true },

    question: { type: String, required: true },
    answer:   { type: String, required: true },

    // Number of unique users who pinned this question across all sessions
    // for this role. Updated by the cron job.
    uniqueUserPins: { type: Number, default: 0 },

    // Manually set for seeded real-world questions (default 50).
    // Community-promoted questions start at 0.
    baseScore: { type: Number, default: 0 },

    // Computed score = baseScore + (uniqueUserPins × 10)
    // The cron job writes this field; the API sorts by it.
    score: { type: Number, default: 0, index: true },

    // "seeded" = pre-populated real-world question
    // "community" = promoted from pin aggregation
    source: {
      type: String,
      enum: ["seeded", "community"],
      default: "community",
    },

    // Tags help with display grouping (e.g. "behavioural", "technical", "scenario")
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Compound index: fetch top questions for a role sorted by score in one query
topQuestionSchema.index({ role: 1, score: -1 });

// Prevent exact duplicate questions for the same role
topQuestionSchema.index({ role: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("TopQuestion", topQuestionSchema);