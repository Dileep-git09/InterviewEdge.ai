const { GoogleGenAI } = require("@google/genai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const {
  questionAnswerPrompt,
  conceptExplainPrompt,
  resumeQuestionsPrompt,
} = require("../utils/prompts");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


// ── Shared helper: call Gemini and return clean parsed JSON ──────────────────
const callGeminiForJSON = async (prompt) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
 
  const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
 
  if (!rawText) throw new Error("Empty response from Gemini API");
 
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```$/, "")
    .trim();
 
  return JSON.parse(cleanedText);
};
 
// ── Shared helper: extract plain text from uploaded file buffer ──────────────
const extractTextFromFile = async (buffer, mimetype, originalname) => {
  const ext = originalname.split(".").pop().toLowerCase();
 
  // PDF
  if (mimetype === "application/pdf" || ext === "pdf") {
    const parsed = await pdfParse(buffer);
    return parsed.text.trim();
  }
 
  // DOCX / DOC
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



// ==========================================
// Generate Interview Questions
// ==========================================
const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus, difficulty = "medium" } = req.body;

    // Default questions if frontend doesn't send
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    // Correct Gemini response parsing
    const rawText =
      response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      throw new Error("Empty response from Gemini API");
    }

    // Remove markdown formatting if Gemini adds it
    const cleanedText = rawText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();

    let data;

    try {
      data = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Gemini returned invalid JSON:");
      console.error(cleanedText);

      throw new Error("AI returned invalid JSON format");
    }
     // Attach difficulty to each question object so the session/question
    // controllers can persist it to MongoDB
    const dataWithDifficulty = data.map((q) => ({
      ...q,
      difficulty: safeDifficulty,
    }));

    res.status(200).json(data);

  } catch (error) {
    console.error("Error generating questions:", error);

    res.status(500).json({
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};



// ==========================================
// Generate Concept Explanation
// ==========================================
const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Missing required field: question",
      });
    }

    const prompt = conceptExplainPrompt(question);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const rawText =
      response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      throw new Error("Empty response from Gemini API");
    }

    const cleanedText = rawText
      .replace(/^```json\s*/, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();

    let data;

    try {
      data = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Gemini returned invalid JSON:");
      console.error(cleanedText);

      throw new Error("AI returned invalid JSON format");
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Error generating explanation:", error);

    res.status(500).json({
      message: "Failed to generate explanation",
      error: error.message,
    });
  }
};


// ============================================================
// Generate Questions From Resume  (new)
// POST /api/ai/generate-from-resume
// Expects: multipart/form-data with field "resume" (PDF / DOC / DOCX)
// ============================================================
const generateQuestionsFromResume = async (req, res) => {
  try {
    // multer puts the file on req.file
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded. Please upload a PDF or Word document." });
    }
 
    const { buffer, mimetype, originalname, size } = req.file;
 
    // Guard: 5 MB max
    const MAX_SIZE = 5 * 1024 * 1024;
    if (size > MAX_SIZE) {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5 MB." });
    }
 
    // ── Step 1: Extract plain text from the file ──────────────────────────
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
 
    // Trim to ~8000 characters to stay within Gemini token limits
    const trimmedText = resumeText.slice(0, 8000);
 
    // ── Step 2: Feed to Gemini ────────────────────────────────────────────
    const prompt = resumeQuestionsPrompt(trimmedText);
    const data = await callGeminiForJSON(prompt);
 
    // Validate the expected shape
    if (!data.sections || !Array.isArray(data.sections)) {
      throw new Error("Unexpected response shape from AI");
    }
 
    res.status(200).json({
      success: true,
      fileName: originalname,
      sections: data.sections,
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