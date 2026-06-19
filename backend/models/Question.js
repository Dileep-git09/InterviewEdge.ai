const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    session:  { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    question: { type: String },
    answer:   { type: String },
    note:     { type: String },
    isPinned: { type: Boolean, default: false },

    // Difficulty — used by manually created sessions
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    // Resume section this question belongs to (e.g. "Skills", "Projects", "Experience")
    // Empty string for manually created questions
    section: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);