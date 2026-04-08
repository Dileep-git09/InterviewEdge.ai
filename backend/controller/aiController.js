const { GoogleGenAI } = require("@google/genai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Session = require("../models/Session");
const Question = require("../models/Question");
const {
  questionAnswerPrompt,
  conceptExplainPrompt,
  resumeQuestionsPrompt,
} = require("../utils/prompts");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// extractAndParseJSON
//
// Root cause of the SyntaxError:
//   Gemini occasionally wraps code examples inside answer strings with triple-
//   backtick fences and literal newline characters, e.g.:
//     "answer": "Here is an example:\n```js\nconst x = 1;\n```\nThis breaks JSON."
//   Literal newlines and unescaped backticks inside a JSON string are invalid,
//   so JSON.parse throws at that position.
//
// Strategy (tries each in order, returns on first success):
//   1. Direct parse — works when Gemini behaves perfectly.
//   2. Strip outer markdown fences then parse.
//   3. Extract the outermost [ … ] or { … } block with a bracket-depth scanner,
//      then parse — isolates the JSON even if Gemini adds prose before/after.
//   4. Sanitise the raw text (escape unescaped control chars, strip embedded
//      code fences inside string values) then parse.
//   5. Throw a descriptive error so the caller can log and surface it cleanly.
// ─────────────────────────────────────────────────────────────────────────────
const extractAndParseJSON = (rawText) => {
  if (!rawText || !rawText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }
 
  // ── Strategy 1: direct parse ─────────────────────────────────────────────
  try {
    return JSON.parse(rawText.trim());
  } catch (_) { /* fall through */ }
 
  // ── Strategy 2: strip outer markdown fences ──────────────────────────────
  const stripped = rawText
    .replace(/^```(?:json)?\s*/i, "")   // opening fence (```json or ```)
    .replace(/\s*```\s*$/i, "")          // closing fence
    .trim();
 
  try {
    return JSON.parse(stripped);
  } catch (_) { /* fall through */ }
 
  // ── Strategy 3: bracket-depth scan to extract outermost JSON block ────────
  // Scans character-by-character to find the first complete [...] or {...}.
  // Works even when Gemini adds introductory text before the JSON.
  const extractOutermostBlock = (text) => {
    for (let i = 0; i < text.length; i++) {
      const startChar = text[i];
      if (startChar !== "[" && startChar !== "{") continue;
 
      const closeChar = startChar === "[" ? "]" : "}";
      let depth = 0;
      let inString = false;
      let escape = false;
 
      for (let j = i; j < text.length; j++) {
        const c = text[j];
 
        if (escape) { escape = false; continue; }
        if (c === "\\" && inString) { escape = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (inString) continue;
 
        if (c === startChar) depth++;
        else if (c === closeChar) {
          depth--;
          if (depth === 0) return text.slice(i, j + 1);
        }
      }
    }
    return null;
  };
 
  const block = extractOutermostBlock(rawText);
  if (block) {
    try {
      return JSON.parse(block);
    } catch (_) { /* fall through to strategy 4 */ }
  }
 
  // ── Strategy 4: sanitise then parse ─────────────────────────────────────
  // Handles the most common Gemini quirk: literal newlines and embedded
  // ``` code fences inside JSON string values.
  const sanitise = (text) => {
    // Work on the best candidate we have so far
    const candidate = block || stripped || text;
 
    return candidate
      // Remove embedded triple-backtick code fences inside strings.
      // Replaces ```lang\n...code...\n``` with a single escaped newline + code.
      .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
        code.replace(/\n/g, "\\n").replace(/"/g, '\\"')
      )
      // Escape literal newlines that appear inside string values.
      // Only targets newlines between two non-bracket characters (i.e. inside a value).
      .replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (match) =>
          match
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r")
            .replace(/\t/g, "\\t")
      )
      // Remove trailing commas before } or ] (common Gemini mistake)
      .replace(/,\s*([}\]])/g, "$1");
  };
 
  try {
    return JSON.parse(sanitise(rawText));
  } catch (finalErr) {
    // Log the raw text to help diagnose future variants
    console.error("─── Gemini raw response (parse failed) ───");
    console.error(rawText.slice(0, 500)); // first 500 chars for diagnosis
    console.error("──────────────────────────────────────────");
    throw new Error(
      `Gemini returned malformed JSON and all recovery strategies failed. ` +
        `Original error: ${finalErr.message}`
    );
  }
};

// ── Shared: call Gemini and return parsed JSON ───────────────────────────────
const callGeminiForJSON = async (prompt) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!rawText) throw new Error("Empty response from Gemini API");

   return extractAndParseJSON(rawText);
};

// ── Shared: extract plain text from PDF or DOCX buffer ──────────────────────
const extractTextFromFile = async (buffer, mimetype, originalname) => {
  const ext = originalname.split(".").pop().toLowerCase();

  if (mimetype === "application/pdf" || ext === "pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text.trim();
  }

  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword" ||
    ext === "docx" ||
    ext === "doc"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  throw new Error(
    "Unsupported file type. Please upload a PDF or Word document (.pdf, .doc, .docx)."
  );
};

// ============================================================
// Generate Interview Questions  (existing)
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
    const safeDifficulty = validDifficulties.includes(difficulty)
      ? difficulty
      : "medium";

    const prompt = questionAnswerPrompt(
      role,
      experience,
      topicsToFocus,
      numberOfQuestions,
      safeDifficulty
    );

    const data = await callGeminiForJSON(prompt);

    const dataWithDifficulty = data.map((q) => ({
      ...q,
      difficulty: safeDifficulty,
    }));

    res.status(200).json(dataWithDifficulty);
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

// ============================================================
// Generate Concept Explanation  (existing)
// ============================================================
const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res
        .status(400)
        .json({ message: "Missing required field: question" });
    }

    const prompt = conceptExplainPrompt(question);
    const data = await callGeminiForJSON(prompt);

    res.status(200).json(data);
  } catch (error) {
    console.error("Error generating explanation:", error.message);
    res.status(500).json({
      message: "Failed to generate explanation",
      error: error.message,
    });
  }
};

// ============================================================
// Generate Questions From Resume + Save Session  (new)
// POST /api/ai/generate-from-resume
// Expects: multipart/form-data with field "resume" (PDF / DOC / DOCX)
// Returns: { success, sessionId, fileName, sections }
// ============================================================
const generateQuestionsFromResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded. Please upload a PDF or Word document.",
      });
    }

    const { buffer, mimetype, originalname, size } = req.file;

    // 5 MB guard
    if (size > 5 * 1024 * 1024) {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5 MB." });
    }

    // ── Step 1: Extract text ──────────────────────────────────────────────
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

    // ── Step 2: Generate questions via Gemini ─────────────────────────────
    const prompt = resumeQuestionsPrompt(trimmedText);
    const aiData = await callGeminiForJSON(prompt);

    if (!aiData.sections || !Array.isArray(aiData.sections)) {
      throw new Error("Unexpected response shape from AI");
    }

    const { sections } = aiData;

    // ── Step 3: Save session to MongoDB ───────────────────────────────────
    const userId = req.user._id;

    // Build a readable topicsToFocus from section names
    const sectionNames = sections.map((s) => s.section).join(", ");

    // Derive a clean display name from the filename (strip extension)
    const displayName = originalname.replace(/\.[^/.]+$/, "");

    // Create the session document
    const session = await Session.create({
      user: userId,
      role: displayName,           // shown as the "title" on the dashboard card
      experience: "From Resume",   // placeholder — resume sessions don't have YOE
      topicsToFocus: sectionNames, // e.g. "Skills, Experience, Projects"
      description: `Auto-generated from ${originalname}`,
      source: "resume",
      resumeFileName: originalname,
    });

    // Flatten all section questions into individual Question documents,
    // storing the section name on each so the frontend can re-group them.
    const allQuestionIds = [];

    for (const sec of sections) {
      const created = await Question.insertMany(
        sec.questions.map((q) => ({
          session: session._id,
          question: q.question,
          answer: q.answer,
          section: sec.section,   // e.g. "Skills", "Projects"
          difficulty: "medium",   // resume questions don't have a set difficulty
        }))
      );
      allQuestionIds.push(...created.map((q) => q._id));
    }

    session.questions = allQuestionIds;
    await session.save();

    // ── Step 4: Respond ───────────────────────────────────────────────────
    res.status(200).json({
      success: true,
      sessionId: session._id,
      fileName: originalname,
      sections,  // returned so the toast can show section count immediately
    });
  } catch (error) {
    console.error("Error generating resume questions:", error);
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