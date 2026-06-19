const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────────
// MockInterview
//
// Represents one timed mock-interview attempt by a user. Unlike Session (which
// is a study/review artifact), a MockInterview captures the candidate's OWN
// typed answers and the AI's evaluation of each one.
//
// Questions are embedded subdocuments here (not refs) because:
//   - They are never queried independently of their parent attempt.
//   - Each carries attempt-specific data (userAnswer, score, feedback) that
//     only makes sense inside this attempt.
//   - The idealAnswer is stored server-side and is NEVER sent to the client
//     until the question has been answered or the attempt is completed — this
//     stops candidates from peeking at the model answer mid-question.
// ─────────────────────────────────────────────────────────────────────────────

const mockQuestionSchema = new mongoose.Schema(
  {
    question:    { type: String, required: true },
    idealAnswer: { type: String, default: "" }, // hidden until answered/completed

    // Filled in when the candidate submits an answer
    userAnswer:  { type: String, default: "" },
    answered:    { type: Boolean, default: false },
    skipped:     { type: Boolean, default: false },

    // AI evaluation
    score:        { type: Number, default: null, min: 0, max: 100 },
    verdict:      { type: String, default: "" },
    strengths:    [{ type: String }],
    improvements: [{ type: String }],
    missedPoints: [{ type: String }],
    modelAnswer:  { type: String, default: "" },

    timeTakenSec: { type: Number, default: 0 },
    answeredAt:   { type: Date },
  },
  { _id: true }
);

const mockInterviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Optional link back to the Session this mock was generated from
    sourceSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      default: null,
    },

    role:          { type: String, required: true },
    experience:    { type: String, default: "" },
    topicsToFocus: { type: String, default: "" },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    secondsPerQuestion: { type: Number, default: 120 },

    questions: [mockQuestionSchema],

    status: {
      type: String,
      enum: ["in_progress", "completed", "abandoned"],
      default: "in_progress",
      index: true,
    },

    // Aggregate results — written on completion
    overallScore:    { type: Number, default: null },
    overallVerdict:  { type: String, default: "" },
    summary:         { type: String, default: "" },
    topStrengths:    [{ type: String }],
    focusAreas:      [{ type: String }],

    totalTimeSec: { type: Number, default: 0 },
    startedAt:    { type: Date, default: Date.now },
    completedAt:  { type: Date },
  },
  { timestamps: true }
);

// Fast retrieval of a user's attempt history, newest first
mockInterviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("MockInterview", mockInterviewSchema);