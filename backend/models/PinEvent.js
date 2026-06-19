const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────────
// PinEvent
//
// A lightweight event log: every time a user pins a question we write one
// document here. The cron job reads these to compute uniqueUserPins per role.
//
// Why a separate collection instead of counting directly on Question?
//   - Questions are session-scoped. The same question text can appear in
//     multiple sessions across many users. We need to count unique users
//     who considered that question important for a given role — regardless
//     of which session it came from.
//   - This event log lets us do that aggregation correctly in one MongoDB
//     $group pipeline, and also lets us add time-decay later (recent pins
//     worth more than old pins).
// ─────────────────────────────────────────────────────────────────────────────

const pinEventSchema = new mongoose.Schema(
  {
    // The user who pinned
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Normalised role from the session (lowercase, trimmed)
    role: { type: String, required: true, index: true },

    // The full question text — used to group identical questions across sessions
    question: { type: String, required: true },

    // The answer stored alongside so we can surface it in TopQuestion
    answer: { type: String, required: true },

    // true = pinned, false = unpinned (lets us correctly subtract on unpin)
    pinned: { type: Boolean, required: true },
  },
  { timestamps: true }
);

// Index for the cron aggregation query: group by role + question
pinEventSchema.index({ role: 1, question: 1 });

// Prevent a user pinning the same question in the same role more than once
// (unique per user+role+question combination — unpin replaces with pinned:false)
pinEventSchema.index({ user: 1, role: 1, question: 1 }, { unique: true });

module.exports = mongoose.model("PinEvent", pinEventSchema);