const DIFFICULTY_CONTEXT = {
  easy: "beginner-friendly, conceptual or definitional, suitable for someone just starting out — no complex implementation required",
  medium:
    "intermediate level, requiring applied knowledge, practical examples, or moderate problem-solving skills",
  hard: "advanced level, requiring deep expertise, architecture tradeoffs, system design understanding, or complex implementation",
};

// ── Existing prompt: interview Q&A from role/experience/topics ───────────────
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
- Write ${numberOfQuestions} interview questions strictly at the ${difficulty} difficulty level.
- For each question, generate a detailed but clear answer appropriate for the difficulty level.
- If the answer needs a code example, add a small code block inside.
- Keep formatting very clean.
- Return a pure JSON array like:

[
  {
    "question": "Question here?",
    "answer": "Answer here."
  },
  ...
]

Important: Do NOT add any extra text. Only return valid JSON.`;
};

// ── Existing prompt: concept explanation ────────────────────────────────────
const conceptExplainPrompt = (question) => {
  return `You are an AI trained to generate explanations for a given interview question.

Task:
- Explain the following interview question and its concept in depth as if you're teaching a beginner developer.
- Question: "${question}"
- After the explanation, provide a short and clear title that summarizes the concept for the article or page header.
- If the explanation includes a code example, provide a small code block.
- Keep the formatting very clean and clear.
- Return the result as a valid JSON object in the following format:

{
  "title": "Short title here?",
  "explanation": "Explanation here."
}

Important: Do NOT add any extra text outside the JSON format. Only return valid JSON.`;
};

// ── New prompt: generate interview questions from resume text ────────────────
const resumeQuestionsPrompt = (resumeText) => {
  return `You are an expert technical interviewer. A candidate has shared their resume. 
Analyze it thoroughly and generate targeted interview questions for EACH section present in the resume.

Resume Content:
"""
${resumeText}
"""

Instructions:
- Read every section of the resume carefully: Skills, Experience, Projects, Certifications, Education, and any other sections present.
- For each section that exists in the resume, generate 3–5 relevant, specific interview questions based on what is actually written.
- Each question must also include a concise model answer.
- Questions should be specific to what the candidate has listed — not generic. For example, if they listed "React" in skills, ask about React specifics they might know based on their experience level.
- For Projects: ask about design decisions, challenges faced, tech stack choices.
- For Experience: ask about responsibilities, achievements, and real situations they handled.
- For Skills: ask about depth of knowledge and practical usage.
- For Certifications: ask about concepts tested in that certification.
- For Education: ask about relevant coursework or academic projects if present.

Return ONLY a valid JSON object in this exact format — no markdown, no extra text:

{
  "sections": [
    {
      "section": "Section name here (e.g. Skills, Experience, Projects, Certifications, Education)",
      "questions": [
        {
          "question": "Specific question based on resume content?",
          "answer": "Clear, concise model answer."
        }
      ]
    }
  ]
}

Important: Only include sections that actually exist in the resume. Do NOT invent sections.`;
};

module.exports = { questionAnswerPrompt, conceptExplainPrompt, resumeQuestionsPrompt };