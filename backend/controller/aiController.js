const pdfParse = require("pdf-parse");
const mammoth  = require("mammoth");
const crypto   = require("crypto");
const Session  = require("../models/Session");
const Question = require("../models/Question");
const { redisClient }   = require("../config/redis");
const { callAIForJSON, normaliseQuestionsArray } = require("../utils/gemini");   // ← shared helper (Gemini + Grok fallback)
const {
  questionAnswerPrompt,
  conceptExplainPrompt,
  resumeQuestionsPrompt,
} = require("../utils/prompts");

// ─────────────────────────────────────────────────────────────────────────────
// Cache TTLs (in seconds)
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_TTL = {
  QUESTIONS:   60 * 60 * 24,      // 24 hours — Q&A sets don't change
  EXPLANATION: 60 * 60 * 24 * 7,  // 7 days  — concept explanations are evergreen
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache helpers
// ─────────────────────────────────────────────────────────────────────────────
const getCache = async (key) => {
  try {
    if (!redisClient.isReady) return null;
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    console.error("Redis GET error:", err.message);
    return null;
  }
};

const setCache = async (key, data, ttlSeconds) => {
  try {
    if (!redisClient.isReady) return;
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.error("Redis SET error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cache key builders
// ─────────────────────────────────────────────────────────────────────────────
const buildQuestionsKey = (role, experience, topicsToFocus, difficulty, numberOfQuestions) => {
  const normalised = [role, experience, topicsToFocus, difficulty, numberOfQuestions]
    .map((v) => String(v).toLowerCase().trim())
    .join("|");
  const hash = crypto.createHash("md5").update(normalised).digest("hex");
  return `ai:questions:${hash}`;
};

const buildExplanationKey = (question) => {
  const hash = crypto
    .createHash("md5")
    .update(question.toLowerCase().trim())
    .digest("hex");
  return `ai:explanation:${hash}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Extract plain text from PDF or DOCX buffer
// ─────────────────────────────────────────────────────────────────────────────
const extractTextFromFile = async (buffer, mimetype, originalname) => {
  const ext = originalname.split(".").pop().toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text.trim();
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    ext === "docx" || ext === "doc"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF or Word document (.pdf, .doc, .docx)."
  );
};

// ============================================================
// Generate Interview Questions
// ✅ Redis cache: 24 hours
// ============================================================
const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus, difficulty = "medium" } = req.body;
    const numberOfQuestions = req.body.numberOfQuestions || 5;

    if (!role || !experience || !topicsToFocus) {
      return res.status(400).json({
        message: "Missing required fields: role, experience, topicsToFocus",
      });
    }

    const validDifficulties = ["easy", "medium", "hard"];
    const safeDifficulty = validDifficulties.includes(difficulty) ? difficulty : "medium";

    // ── Check cache ──────────────────────────────────────────────────────────
    const cacheKey = buildQuestionsKey(
      role, experience, topicsToFocus, safeDifficulty, numberOfQuestions
    );

    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.status(200).set("X-Cache", "HIT").json(cached);
    }

    console.log(`Cache MISS: ${cacheKey} — calling AI`);

    // ── Cache miss: call AI (Gemini → Grok fallback) ─────────────────────────
    const prompt = questionAnswerPrompt(
      role, experience, topicsToFocus, numberOfQuestions, safeDifficulty
    );

    const data = await callAIForJSON(prompt);
    const questionsArray = normaliseQuestionsArray(data);

    if (!questionsArray) {
      throw new Error("AI returned an unexpected response shape (expected a JSON array of questions).");
    }

    const dataWithDifficulty = questionsArray.map((q) => ({
      ...q,
      difficulty: safeDifficulty,
    }));

    await setCache(cacheKey, dataWithDifficulty, CACHE_TTL.QUESTIONS);

    res.status(200).set("X-Cache", "MISS").json(dataWithDifficulty);
  } catch (error) {
    console.error("Error generating questions:", error.message);
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

// ============================================================
// Generate Concept Explanation
// ✅ Redis cache: 7 days
// ============================================================
const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Missing required field: question" });
    }

    // ── Check cache ──────────────────────────────────────────────────────────
    const cacheKey = buildExplanationKey(question);

    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return res.status(200).set("X-Cache", "HIT").json(cached);
    }

    console.log(`Cache MISS: ${cacheKey} — calling AI`);

    // ── Cache miss: call AI ──────────────────────────────────────────────────
    const prompt = conceptExplainPrompt(question);
    const data   = await callAIForJSON(prompt);

    await setCache(cacheKey, data, CACHE_TTL.EXPLANATION);

    res.status(200).set("X-Cache", "MISS").json(data);
  } catch (error) {
    console.error("Error generating explanation:", error.message);
    res.status(500).json({
      message: "Failed to generate explanation",
      error: error.message,
    });
  }
};

// ============================================================
// Generate Questions From Resume + Save Session
// ❌ NOT cached — every resume is unique content.
// ============================================================
const generateQuestionsFromResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded. Please upload a PDF or Word document.",
      });
    }

    const { buffer, mimetype, originalname, size } = req.file;

    if (size > 5 * 1024 * 1024) {
      return res.status(400).json({ message: "File too large. Maximum size is 5 MB." });
    }

    // Step 1: Extract text
    let resumeText;
    try {
      resumeText = await extractTextFromFile(buffer, mimetype, originalname);
    } catch (parseError) {
      return res.status(400).json({ message: parseError.message });
    }

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({
        message:
          "Could not extract readable text from the file. Make sure it is not a scanned image PDF.",
      });
    }

    const trimmedText = resumeText.slice(0, 8000);

    // Step 2: Generate questions via AI (Gemini → Grok fallback)
    const prompt  = resumeQuestionsPrompt(trimmedText);
    const aiData  = await callAIForJSON(prompt);

    if (!aiData.sections || !Array.isArray(aiData.sections)) {
      throw new Error("Unexpected response shape from AI");
    }

    const { sections } = aiData;

    // Step 3: Save session to MongoDB
    const userId      = req.user._id;
    const sectionNames = sections.map((s) => s.section).join(", ");
    const displayName  = originalname.replace(/\.[^/.]+$/, "");

    const session = await Session.create({
      user: userId,
      role: displayName,
      experience: "From Resume",
      topicsToFocus: sectionNames,
      description: `Auto-generated from ${originalname}`,
      source: "resume",
      resumeFileName: originalname,
    });

    const allQuestionIds = [];
    for (const sec of sections) {
      const created = await Question.insertMany(
        sec.questions.map((q) => ({
          session:    session._id,
          question:   q.question,
          answer:     q.answer,
          section:    sec.section,
          difficulty: "medium",
        }))
      );
      allQuestionIds.push(...created.map((q) => q._id));
    }

    session.questions = allQuestionIds;
    await session.save();

    res.status(200).json({
      success: true,
      sessionId: session._id,
      fileName: originalname,
      sections,
    });
  } catch (error) {
    console.error("Error generating resume questions:", error.message);
    res.status(500).json({
      message: "Failed to generate questions from resume",
      error: error.message,
    });
  }
};

module.exports = {
  generateInterviewQuestions,
  generateConceptExplanation,
  generateQuestionsFromResume,
};
