const Session = require("../models/Session");
const Question = require("../models/Question");

// @desc    Create a new session and linked questions
// @route   POST /api/sessions/create
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const { 
      role, 
      experience, 
      topicsToFocus, 
      description, 
      questions, 
      difficulty = "medium"
     } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: "questions must be an array" });
    }

    const userId = req.user._id;

    const validDifficulties = ["easy", "medium", "hard"];
    const safeDifficulty = validDifficulties.includes(difficulty)
      ? difficulty
      : "medium";

     // Create the session with difficulty saved in the session document
    const session = await Session.create({
      user: userId,
      role,
      experience,
      topicsToFocus,
      description,
      difficulty: safeDifficulty,
      source: "manual", // Mark as manually created
    });
    // Create each question, persisting its difficulty as well
    const questionDocs = await Promise.all(
      questions.map(async (q) => {
        const question = await Question.create({
          session: session._id,
          question: q.question,
          answer: q.answer,
          difficulty: q.difficulty ||  safeDifficulty, // Save the difficulty in the question document
        });
        return question._id;
      })
    );

    session.questions = questionDocs;
    await session.save();

    // ✅ send response
    res.status(201).json({
      success: true,
      message: "Session created successfully",
      session,
    });
  } catch (error) {
    console.error("🔥 Error in createSession:", error); // for debugging
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all sessions for the logged-in user, paginated
// @route   GET /api/sessions/my-sessions?page=&limit=
// @access  Private
exports.getMySessions = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);

    const [sessions, total] = await Promise.all([
      Session.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("questions"),
      Session.countDocuments({ user: req.user.id }),
    ]);

    res.status(200).json({
      sessions,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get a session by ID with populated questions
// @route   GET /api/sessions/:id
// @access  Private
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate({
        path: "questions",
        options: { sort: { isPinned: -1, createdAt: 1 } },
      })
      .exec();

    if (!session) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    // SECURITY FIX: previously any authenticated user could read any session by
    // guessing its ID. Verify the requesting user actually owns this session.
    if (session.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to view this session" });
    }

    res.status(200).json({ success: true, session });
  } catch (error) {
    console.error("❌ Error in getSessionById:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete a session and its questions
// @route   DELETE /api/sessions/:id
// @access  Private
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Check if the logged-in user owns this session
    if (session.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this session" });
    }

    // First, delete all questions linked to this session
    await Question.deleteMany({ session: session._id });

    // Then, delete the session
    await Session.deleteOne({ _id: session._id });

    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
