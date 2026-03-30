const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    question: String,
    answer: String,
    note: String,
    isPinned: { type: Boolean, default: false },
    //added the difficulty field to the question model
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
