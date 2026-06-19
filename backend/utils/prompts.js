// ─────────────────────────────────────────────────────────────────────────────
// Difficulty descriptions — kept neutral so they apply to any role/industry
// ─────────────────────────────────────────────────────────────────────────────
const DIFFICULTY_CONTEXT = {
  easy:   "foundational — tests basic awareness, definitions, and conceptual understanding suitable for entry-level candidates",
  medium: "applied — tests practical knowledge, real-world problem-solving, and the ability to explain reasoning clearly",
  hard:   "expert — tests deep mastery, strategic thinking, edge-case handling, and the ability to justify complex decisions",
};

// ─────────────────────────────────────────────────────────────────────────────
// questionAnswerPrompt
// Used for manually created interview sessions.
// Generates Q&A pairs for any role in any industry.
// ─────────────────────────────────────────────────────────────────────────────
const questionAnswerPrompt = (
  role,
  experience,
  topicsToFocus,
  numberOfQuestions,
  difficulty = "medium"
) => {
  const difficultyContext =
    DIFFICULTY_CONTEXT[difficulty] || DIFFICULTY_CONTEXT["medium"];

  return `You are a world-class interviewer with expertise across all industries and professions — including but not limited to technology, healthcare, education, civil engineering, finance, law, marketing, science, and the arts.

You are preparing an interview for the following candidate:
- Role applying for: ${role}
- Years of experience: ${experience}
- Topics to assess: ${topicsToFocus}
- Difficulty level: ${difficulty.toUpperCase()} — ${difficultyContext}

Your task:
Generate exactly ${numberOfQuestions} high-quality interview questions with model answers, tailored precisely to this role and these topics.

Strict answer writing rules:
- Write every answer as clear, well-structured prose — complete sentences and paragraphs that a human interviewer would actually say or a candidate would actually speak.
- Match the domain: if the role is a biology teacher, write biological answers. If it is a software engineer, write technical answers. If it is a civil engineer, write engineering answers. Never mix domains.
- Use bullet points or numbered lists only when genuinely comparing multiple items or listing ordered steps — not for every answer.
- Use a code block ONLY if the question explicitly asks to write, read, trace, or debug actual executable code (e.g. "Write a function that…" or "What does this code output?"). If you include a code block, wrap it exactly like this — [CODE:language]the code here[/CODE] — using the correct language name (javascript, python, java, sql, etc.).
- Do NOT use code blocks for explanations, theory, processes, diagrams, definitions, or structured comparisons — even in technical roles.
- Do NOT assume the role is technical unless the role and topics clearly indicate it.

JSON output rules (follow exactly — your output will be parsed by JSON.parse):
1. Return ONLY a valid JSON array. No markdown, no explanation, no text outside the JSON.
2. Do NOT wrap output in \`\`\`json or any code fence.
3. Never put a literal newline inside a JSON string value — use \\n (escaped) instead.
4. Never use curly/smart quotes. Use only straight double quotes.
5. No trailing commas.

Return this exact format and nothing else:
[
  {
    "question": "The interview question here?",
    "answer": "The model answer written as clear prose here."
  }
]`;
};

// ─────────────────────────────────────────────────────────────────────────────
// conceptExplainPrompt
// Used by the "Learn More" drawer to explain a specific question in depth.
// ─────────────────────────────────────────────────────────────────────────────
const conceptExplainPrompt = (question) => {
  return `You are a knowledgeable expert and educator across all fields — technology, science, medicine, law, engineering, business, arts, and more.

A candidate has asked for a deeper explanation of the following interview question:
"${question}"

Your task:
Provide a thorough, clear explanation of the concept behind this question that would genuinely help the candidate understand it and answer it confidently in an interview.

Strict writing rules:
- Write the explanation as clear, natural prose — the way a great teacher or mentor would explain it.
- Identify the domain this question belongs to from context and match your explanation to that domain. Do not assume it is a software engineering question unless the wording clearly indicates it.
- Use bullet points or numbered lists only when comparing items or listing sequential steps.
- Use a code block ONLY if the question is specifically about writing or understanding actual executable code. If you include one, wrap it exactly like this — [CODE:language]the code here[/CODE].
- Do NOT use code blocks for theory, processes, definitions, or conceptual explanations.
- Give a concise title that summarises what concept is being explained.

JSON output rules (follow exactly):
1. Return ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON.
2. Do NOT wrap output in \`\`\`json or any code fence.
3. Never put a literal newline inside a JSON string value — use \\n (escaped) instead.
4. Never use curly/smart quotes. Use only straight double quotes.
5. No trailing commas.

Return this exact format and nothing else:
{
  "title": "Concise concept title here",
  "explanation": "Full explanation written as clear, helpful prose here."
}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// resumeQuestionsPrompt
// Used when a candidate uploads their CV/resume.
// Generates section-by-section targeted questions from the resume content.
// ─────────────────────────────────────────────────────────────────────────────
const resumeQuestionsPrompt = (resumeText) => {
  return `You are a senior interviewer with expertise across all industries and professions. A candidate has shared their resume with you.

Resume content:
"""
${resumeText}
"""

Your task:
Read the entire resume carefully and generate targeted, specific interview questions for every section that exists in it. Questions must be grounded in what is actually written — not generic questions that could apply to anyone.

Section-by-section guidance:
- Skills / Technical Skills: Ask about depth of knowledge, real usage scenarios, and how they applied each skill.
- Work Experience / Employment: Ask about specific responsibilities, measurable achievements, challenges overcome, and decisions made.
- Projects: Ask about the purpose, design decisions, challenges faced, team dynamics, and outcomes.
- Education / Academic Background: Ask about relevant coursework, research, dissertations, or academic achievements if mentioned.
- Certifications / Licenses: Ask about the subject matter, what the certification validates, and how they apply it in practice.
- Achievements / Awards / Publications: Ask about the context, significance, and what it demonstrates about the candidate.
- Any other sections present: Generate relevant questions based on what is actually written there.

Strict answer writing rules:
- Write every model answer as clear, natural prose.
- Infer the candidate's industry from their resume content and match answers to that domain. Do not assume software/technology unless the resume shows it.
- Use bullet points or numbered lists only when genuinely comparing items or listing steps.
- Use a code block ONLY if the question is specifically about writing or understanding actual executable code, wrapped as [CODE:language]code here[/CODE].
- Do NOT use code blocks for theory, process descriptions, or non-code content.
- Generate 3–5 questions per section. Only include sections that actually exist in the resume.

JSON output rules (follow exactly):
1. Return ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON.
2. Do NOT wrap output in \`\`\`json or any code fence.
3. Never put a literal newline inside a JSON string value — use \\n (escaped) instead.
4. Never use curly/smart quotes. Use only straight double quotes.
5. No trailing commas.

Return this exact format and nothing else:
{
  "sections": [
    {
      "section": "Exact section name from the resume",
      "questions": [
        {
          "question": "Specific question based on what is written in the resume?",
          "answer": "Clear, helpful model answer written as prose."
        }
      ]
    }
  ]
}`;
};

module.exports = { questionAnswerPrompt, conceptExplainPrompt, resumeQuestionsPrompt };