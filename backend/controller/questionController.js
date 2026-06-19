const Question = require("../models/Question");
const Session  = require("../models/Session");
const PinEvent = require("../models/PinEvent");
const { normaliseRole } = require("./topQuestionController");

// ─────────────────────────────────────────────────────────────────────────────
// addQuestionsToSession
// @route POST /api/questions/add
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.addQuestionsToSession = async (req, res) => {
  try {
    const { sessionId, questions } = req.body;

    if (!sessionId || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // SECURITY FIX: verify ownership before mutating the session.
    if (session.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to modify this session" });
    }

    const createdQuestions = await Question.insertMany(
      questions.map((q) => ({
        session:    sessionId,
        question:   q.question,
        answer:     q.answer,
        difficulty: q.difficulty || session.difficulty || "medium",
      }))
    );

    session.questions.push(...createdQuestions.map((q) => q._id));
    await session.save();

    res.status(201).json(createdQuestions);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// togglePinQuestion
// @route POST /api/questions/:id/pin
// @access Private
//
// On every pin/unpin we write a PinEvent so the hourly cron job can aggregate
// community-wide pin counts per role. This is what drives the TopQuestions
// feature — questions pinned by many users for the same role bubble up.
// ─────────────────────────────────────────────────────────────────────────────
exports.togglePinQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate("session");

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // SECURITY FIX: verify the question belongs to one of the user's sessions.
    if (
      !question.session ||
      question.session.user.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to modify this question" });
    }

    // Toggle the pin
    question.isPinned = !question.isPinned;
    await question.save();

    // ── Write PinEvent for community aggregation ──────────────────────────
    // We record the normalised role from the session so the cron job can
    // group questions correctly regardless of how the role was typed.
    if (question.session && question.session.role) {
      const normalisedRole = normaliseRole(question.session.role);

      try {
        await PinEvent.findOneAndUpdate(
          {
            user:     req.user._id,
            role:     normalisedRole,
            question: question.question,
          },
          {
            $set: {
              answer: question.answer,
              pinned: question.isPinned,
            },
          },
          { upsert: true }
        );
      } catch (pinErr) {
        // Non-fatal — pin event logging should never break the pin action itself
        console.error("PinEvent write error:", pinErr.message);
      }
    }

    res.status(200).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// updateQuestionNote
// @route POST /api/questions/:id/note
// @access Private
// ─────────────────────────────────────────────────────────────────────────────
exports.updateQuestionNote = async (req, res) => {
  try {
    const { note } = req.body;
    // Populate the parent session so we can verify ownership.
    const question = await Question.findById(req.params.id).populate("session");

    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    // SECURITY FIX: verify the question belongs to one of the user's sessions.
    if (
      !question.session ||
      question.session.user.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to modify this question" });
    }

    question.note = note || "";
    await question.save();

    res.status(200).json({ success: true, question });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};