const DIFFICULTY_CONTEXT = {
  easy: "beginner-friendly, conceptual or definitional, suitable for someone just starting out — no complex implementation required",
  medium:
    "intermediate level, requiring applied knowledge, practical examples, or moderate problem-solving skills",
  hard: "advanced level, requiring deep expertise, architecture tradeoffs, system design understanding, or complex implementation",
};

// ── questionAnswerPrompt ─────────────────────────────────────────────────────
const questionAnswerPrompt = (
  role,
  experience,
  topicsToFocus,
  numberOfQuestions,
  difficulty = "medium"
) => {
  const difficultyContext =
    DIFFICULTY_CONTEXT[difficulty] || DIFFICULTY_CONTEXT["medium"];

  return `You are an AI trained to generate technical interview questions and answers.

Task:
- Role: ${role}
- Candidate Experience: ${experience} years
- Focus Topics: ${topicsToFocus}
- Difficulty Level: ${difficulty.toUpperCase()} — ${difficultyContext}
- Write exactly ${numberOfQuestions} interview questions at the ${difficulty} difficulty level.
- For each question, generate a detailed but clear answer appropriate for the difficulty level.

CRITICAL JSON FORMATTING RULES — you MUST follow these exactly:
1. Return ONLY a raw JSON array. No markdown, no prose, no explanation outside the JSON.
2. Do NOT wrap the output in \`\`\`json or any code fence.
3. If an answer includes a code example, write the code inline using escaped newlines (\\n) and escaped quotes (\\\"), NOT inside triple backtick fences.
4. Never include literal newline characters inside a JSON string value. Always use \\n instead.
5. Never use smart/curly quotes (" "). Always use straight double quotes (").

Required output format (return only this, nothing else):
[
  {
    "question": "Question text here?",
    "answer": "Answer text here. Code example: function foo() {\\n  return true;\\n}"
  }
]`;
};

// ── conceptExplainPrompt ─────────────────────────────────────────────────────
const conceptExplainPrompt = (question) => {
  return `You are an AI trained to generate explanations for a given interview question.

Task:
- Explain the following interview question and its concept in depth as if you are teaching a beginner developer.
- Question: "${question}"
- Provide a short clear title that summarises the concept.
- If the explanation includes a code example, write the code inline using escaped newlines (\\n), NOT inside triple backtick fences.

CRITICAL JSON FORMATTING RULES — you MUST follow these exactly:
1. Return ONLY a raw JSON object. No markdown, no prose, no explanation outside the JSON.
2. Do NOT wrap the output in \`\`\`json or any code fence.
3. Never include literal newline characters inside a JSON string value. Always use \\n instead.
4. Never use smart/curly quotes (" "). Always use straight double quotes (").

Required output format (return only this, nothing else):
{
  "title": "Short concept title here",
  "explanation": "Full explanation here. Code: function example() {\\n  return true;\\n}"
}`;
};

// ── resumeQuestionsPrompt ────────────────────────────────────────────────────
const resumeQuestionsPrompt = (resumeText) => {
  return `You are an expert technical interviewer. A candidate has shared their resume.
Analyse it thoroughly and generate targeted interview questions for EACH section present.

Resume Content:
"""
${resumeText}
"""

Instructions:
- Read every section: Skills, Experience, Projects, Certifications, Education, and any others present.
- For each section that exists, generate 3–5 relevant, specific questions based on what is actually written.
- Each question must include a concise model answer.
- Questions must be specific to the candidate's resume — not generic.
- For Projects: ask about design decisions, challenges, tech stack choices.
- For Experience: ask about responsibilities, achievements, real situations.
- For Skills: ask about depth of knowledge and practical usage.
- For Certifications: ask about concepts tested in that certification.
- Only include sections that actually exist in the resume.

CRITICAL JSON FORMATTING RULES — you MUST follow these exactly:
1. Return ONLY a raw JSON object. No markdown, no prose, no explanation outside the JSON.
2. Do NOT wrap the output in \`\`\`json or any code fence.
3. If an answer includes a code example, write the code inline using escaped newlines (\\n) and escaped quotes (\\\"), NOT inside triple backtick fences.
4. Never include literal newline characters inside a JSON string value. Always use \\n instead.
5. Never use smart/curly quotes (" "). Always use straight double quotes (").

Required output format (return only this, nothing else):
{
  "sections": [
    {
      "section": "Section name here (e.g. Skills, Experience, Projects)",
      "questions": [
        {
          "question": "Specific question based on resume content?",
          "answer": "Clear, concise model answer."
        }
      ]
    }
  ]
}`;
};


module.exports = { questionAnswerPrompt, conceptExplainPrompt, resumeQuestionsPrompt };