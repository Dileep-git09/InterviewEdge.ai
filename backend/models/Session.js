const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    role:          { type: String, required: true },
    experience:    { type: String, required: true },
    topicsToFocus: { type: String, required: true },
    description:   { type: String, default: "" },

    // Difficulty level — used by manually created sessions
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    // "manual" = created via the form, "resume" = generated from an uploaded CV
    source: {
      type: String,
      enum: ["manual", "resume"],
      default: "manual",
    },

    // Original filename of the uploaded resume (only set when source = "resume")
    resumeFileName: { type: String, default: "" },

    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);