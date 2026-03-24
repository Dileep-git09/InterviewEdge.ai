const { GoogleGenAI } = require("@google/genai");
const {
  questionAnswerPrompt,
  conceptExplainPrompt,
} = require("../utils/prompts");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});


// ==========================================
// Generate Interview Questions
// ==========================================
const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus } = req.body;

    // Default questions if frontend doesn't send
    const numberOfQuestions = req.body.numberOfQuestions || 5;

    if (!role || !experience || !topicsToFocus) {
      return res.status(400).json({
        message: "Missing required fields: role, experience, topicsToFocus",
      });
    }

    const prompt = questionAnswerPrompt(
      role,
      experience,
      topicsToFocus,
      numberOfQuestions
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


module.exports = {
  generateInterviewQuestions,
  generateConceptExplanation,
};