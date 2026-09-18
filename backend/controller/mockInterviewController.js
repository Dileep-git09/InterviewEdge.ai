const MockInterview = require("../models/MockInterview");
const Session = require("../models/Session");
const mongoose = require("mongoose");
const { callGeminiForJSON } = require("../utils/gemini");
const {
  mockQuestionsPrompt,
  mockEvaluationPrompt,
  mockSummaryPrompt,
} = require("../utils/mockPrompts");

const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

// Returns true only for a syntactically valid Mongo ObjectId. Lets us reject
// bad ids (e.g. the literal string "undefined") with a clean 404 instead of a
// 500 + "Cast to ObjectId failed" stack trace.
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

// Strip idealAnswer / evaluation from unanswered questions before sending to
// the client. Prevents the candidate from peeking at the model answer.
const toClientQuestion = (q, revealAll = false) => {
  const reveal = revealAll || q.answered || q.skipped;
  return {
    _id:          q._id,
    question:     q.question,
    answered:     q.answered,
    skipped:      q.skipped,
    userAnswer:   q.userAnswer,
    timeTakenSec: q.timeTakenSec,
    // Only reveal scoring + ideal answer once answered/completed
    score:        reveal ? q.score : null,
    verdict:      reveal ? q.verdict : "",
    strengths:    reveal ? q.strengths : [],
    improvements: reveal ? q.improvements : [],
    missedPoints: reveal ? q.missedPoints : [],
    modelAnswer:  reveal ? q.modelAnswer : "",
    idealAnswer:  reveal ? q.idealAnswer : "",
  };
};

const toClientMock = (mock, revealAll = false) => ({
  _id:                mock._id,
  role:               mock.role,
  experience:         mock.experience,
  topicsToFocus:      mock.topicsToFocus,
  difficulty:         mock.difficulty,
  secondsPerQuestion: mock.secondsPerQuestion,
  status:             mock.status,
  sourceSession:      mock.sourceSession,
  overallScore:       mock.overallScore,
  overallVerdict:     mock.overallVerdict,
  summary:            mock.summary,
  topStrengths:       mock.topStrengths,
  focusAreas:         mock.focusAreas,
  totalTimeSec:       mock.totalTimeSec,
  startedAt:          mock.startedAt,
  completedAt:        mock.completedAt,
  createdAt:          mock.createdAt,
  total:              mock.questions.length,
  questions:          mock.questions.map((q) => toClientQuestion(q, revealAll || mock.status === "completed")),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mock/start    (Private)
// body: {
//   mode: "fresh" | "session",
//   sessionId?,                       (required when mode === "session")
//   role?, experience?, topicsToFocus?, difficulty?, numberOfQuestions?,  (fresh)
//   secondsPerQuestion?
// }
// ─────────────────────────────────────────────────────────────────────────────
exports.startMockInterview = async (req, res) => {
  try {
    const {
      mode = "fresh",
      sessionId,
      role,
      experience = "",
      topicsToFocus = "",
      difficulty = "medium",
      numberOfQuestions = 5,
      secondsPerQuestion = 120,
    } = req.body;

    const safeDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : "medium";
    const count = Math.min(Math.max(parseInt(numberOfQuestions) || 5, 1), 15);
    const perQ = Math.min(Math.max(parseInt(secondsPerQuestion) || 120, 30), 600);

    let mockData = {
      user: req.user._id,
      difficulty: safeDifficulty,
      secondsPerQuestion: perQ,
    };
    let questions = [];

    if (mode === "session") {
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId is required when mode is 'session'." });
      }

      const session = await Session.findById(sessionId).populate("questions");
      if (!session) {
        return res.status(404).json({ message: "Session not found." });
      }
      // Ownership check
      if (session.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Not authorized to use this session." });
      }

      // Pick up to `count` questions from the session (shuffled for variety)
      const pool = [...session.questions];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      questions = pool.slice(0, count).map((q) => ({
        question:    q.question,
        idealAnswer: q.answer || "",
      }));

      if (questions.length === 0) {
        return res.status(400).json({ message: "This session has no questions to practise." });
      }

      mockData = {
        ...mockData,
        sourceSession: session._id,
        role:          session.role,
        experience:    session.experience,
        topicsToFocus: session.topicsToFocus,
        difficulty:    session.difficulty || safeDifficulty,
      };
    } else {
      // mode === "fresh" — generate brand-new questions via Gemini
      if (!role) {
        return res.status(400).json({ message: "role is required for a fresh mock interview." });
      }

      const prompt = mockQuestionsPrompt(role, experience, topicsToFocus, count, safeDifficulty);
      const generated = await callGeminiForJSON(prompt);

      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error("AI did not return any questions.");
      }

      questions = generated.map((q) => ({
        question:    q.question,
        idealAnswer: q.answer || "",
      }));

      mockData = {
        ...mockData,
        role,
        experience,
        topicsToFocus,
      };
    }

    mockData.questions = questions;
    const mock = await MockInterview.create(mockData);

    return res.status(201).json({ success: true, mock: toClientMock(mock) });
  } catch (error) {
    console.error("Error starting mock interview:", error.message);
    return res.status(500).json({ message: "Failed to start mock interview", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mock/:id/answer   (Private)
// body: { questionIndex, userAnswer, timeTakenSec }
// Evaluates one answer via Gemini and stores the result.
// ─────────────────────────────────────────────────────────────────────────────
exports.submitAnswer = async (req, res) => {
  try {
    const { questionIndex, userAnswer = "", timeTakenSec = 0 } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(404).json({ message: "Mock interview not found." });
    }
    const mock = await MockInterview.findById(req.params.id);
    if (!mock) return res.status(404).json({ message: "Mock interview not found." });
    if (mock.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    if (mock.status === "completed") {
      return res.status(400).json({ message: "This mock interview is already completed." });
    }

    const idx = parseInt(questionIndex);
    if (isNaN(idx) || idx < 0 || idx >= mock.questions.length) {
      return res.status(400).json({ message: "Invalid questionIndex." });
    }

    const q = mock.questions[idx];
    const trimmed = String(userAnswer || "").trim();

    if (!trimmed) {
      // Empty answer → skip without burning a Gemini call
      q.userAnswer    = "";
      q.skipped       = true;
      q.answered      = false;
      q.score         = 0;
      q.verdict       = "No answer was provided for this question.";
      q.strengths     = [];
      q.improvements  = ["Attempt an answer next time — even a partial response earns partial credit."];
      q.missedPoints  = [];
      q.modelAnswer   = q.idealAnswer || "";
      q.timeTakenSec  = timeTakenSec;
      q.answeredAt    = new Date();
      await mock.save();
      return res.status(200).json({ success: true, evaluation: toClientQuestion(q, true) });
    }

    // Evaluate via Gemini
    const prompt = mockEvaluationPrompt(q.question, q.idealAnswer, trimmed, mock.role, mock.difficulty);
    const evalResult = await callGeminiForJSON(prompt);

    let score = parseInt(evalResult.score);
    if (isNaN(score)) score = 0;
    score = Math.min(Math.max(score, 0), 100);

    q.userAnswer    = trimmed;
    q.answered      = true;
    q.skipped       = false;
    q.score         = score;
    q.verdict       = evalResult.verdict || "";
    q.strengths     = Array.isArray(evalResult.strengths) ? evalResult.strengths.slice(0, 4) : [];
    q.improvements  = Array.isArray(evalResult.improvements) ? evalResult.improvements.slice(0, 4) : [];
    q.missedPoints  = Array.isArray(evalResult.missedPoints) ? evalResult.missedPoints.slice(0, 4) : [];
    q.modelAnswer   = evalResult.modelAnswer || q.idealAnswer || "";
    q.timeTakenSec  = timeTakenSec;
    q.answeredAt    = new Date();

    await mock.save();

    return res.status(200).json({ success: true, evaluation: toClientQuestion(q, true) });
  } catch (error) {
    console.error("Error evaluating answer:", error.message);
    return res.status(500).json({ message: "Failed to evaluate answer", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mock/:id/complete   (Private)
// Computes the aggregate score + generates an overall debrief.
// ─────────────────────────────────────────────────────────────────────────────
exports.completeMockInterview = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ message: "Mock interview not found." });
    }
    const mock = await MockInterview.findById(req.params.id);
    if (!mock) return res.status(404).json({ message: "Mock interview not found." });
    if (mock.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    if (mock.status === "completed") {
      return res.status(200).json({ success: true, mock: toClientMock(mock, true) });
    }

    // Average across every question (unanswered = 0)
    const scores = mock.questions.map((q) => (typeof q.score === "number" ? q.score : 0));
    const overallScore = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    const totalTimeSec = mock.questions.reduce((a, q) => a + (q.timeTakenSec || 0), 0);

    // Overall debrief via Gemini (non-fatal — falls back to a computed summary)
    let summaryData = {
      overallVerdict: "",
      summary: "",
      topStrengths: [],
      focusAreas: [],
    };
    try {
      const perQuestion = mock.questions.map((q) => ({ score: q.score, verdict: q.verdict }));
      const prompt = mockSummaryPrompt(mock.role, mock.difficulty, perQuestion);
      const result = await callGeminiForJSON(prompt);
      summaryData = {
        overallVerdict: result.overallVerdict || "",
        summary:        result.summary || "",
        topStrengths:   Array.isArray(result.topStrengths) ? result.topStrengths.slice(0, 4) : [],
        focusAreas:     Array.isArray(result.focusAreas) ? result.focusAreas.slice(0, 4) : [],
      };
    } catch (summaryErr) {
      console.error("Mock summary generation failed (non-fatal):", summaryErr.message);
      summaryData.summary =
        overallScore >= 80 ? "Strong performance overall — you're interview-ready on most of these."
        : overallScore >= 60 ? "A solid attempt with clear room to deepen a few answers."
        : "A useful baseline — review the model answers and try again to improve.";
    }

    mock.status         = "completed";
    mock.overallScore   = overallScore;
    mock.overallVerdict = summaryData.overallVerdict;
    mock.summary        = summaryData.summary;
    mock.topStrengths   = summaryData.topStrengths;
    mock.focusAreas     = summaryData.focusAreas;
    mock.totalTimeSec   = totalTimeSec;
    mock.completedAt    = new Date();

    await mock.save();

    return res.status(200).json({ success: true, mock: toClientMock(mock, true) });
  } catch (error) {
    console.error("Error completing mock interview:", error.message);
    return res.status(500).json({ message: "Failed to complete mock interview", error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mock/:id   (Private) — fetch one attempt (for resume/review)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMockInterview = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ message: "Mock interview not found." });
    }
    const mock = await MockInterview.findById(req.params.id);
    if (!mock) return res.status(404).json({ message: "Mock interview not found." });
    if (mock.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    return res.status(200).json({ success: true, mock: toClientMock(mock) });
  } catch (error) {
    console.error("Error fetching mock interview:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mock/my?page=&limit=   (Private) — lightweight history list, paginated
//
// Max limit is 100 rather than the usual 50 — Analytics needs enough history
// in one call to compute meaningful trends/averages. This is still a real
// cap, not unlimited: a user with a genuinely huge history only gets stats
// over their most recent 100 attempts. A dedicated server-side aggregation
// endpoint would be the fuller fix if that ever becomes a real constraint.
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyMockInterviews = async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);

    const [mocks, total] = await Promise.all([
      MockInterview.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("role difficulty status overallScore totalTimeSec createdAt completedAt questions")
        .lean(),
      MockInterview.countDocuments({ user: req.user._id }),
    ]);

    const list = mocks.map((m) => ({
      _id:          m._id,
      role:         m.role,
      difficulty:   m.difficulty,
      status:       m.status,
      overallScore: m.overallScore,
      totalTimeSec: m.totalTimeSec,
      total:        m.questions?.length || 0,
      answered:     m.questions?.filter((q) => q.answered).length || 0,
      createdAt:    m.createdAt,
      completedAt:  m.completedAt,
    }));

    return res.status(200).json({
      success: true,
      mocks: list,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    console.error("Error listing mock interviews:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/mock/:id   (Private)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteMockInterview = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({ message: "Mock interview not found." });
    }
    const mock = await MockInterview.findById(req.params.id);
    if (!mock) return res.status(404).json({ message: "Mock interview not found." });
    if (mock.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized." });
    }
    await MockInterview.deleteOne({ _id: mock._id });
    return res.status(200).json({ success: true, message: "Mock interview deleted." });
  } catch (error) {
    console.error("Error deleting mock interview:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
};