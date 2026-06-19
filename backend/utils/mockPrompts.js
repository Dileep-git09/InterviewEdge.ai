// ─────────────────────────────────────────────────────────────────────────────
// Mock-interview prompts
//
// Kept separate from utils/prompts.js so your existing prompts file is
// untouched. Import these in mockInterviewController.js.
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_CONTEXT = {
  easy:   "foundational — tests basic awareness, definitions, and conceptual understanding suitable for entry-level candidates",
  medium: "applied — tests practical knowledge, real-world problem-solving, and the ability to explain reasoning clearly",
  hard:   "expert — tests deep mastery, strategic thinking, edge-case handling, and the ability to justify complex decisions",
};

// ── 1. Generate questions WITH ideal answers for a fresh mock ────────────────
// Same domain-aware rules as your questionAnswerPrompt, but the answer field
// here is the "idealAnswer" the candidate will be scored against.
const mockQuestionsPrompt = (role, experience, topicsToFocus, numberOfQuestions, difficulty = "medium") => {
  const difficultyContext = DIFFICULTY_CONTEXT[difficulty] || DIFFICULTY_CONTEXT["medium"];

  return `You are a world-class interviewer with expertise across all industries and professions.

You are running a MOCK INTERVIEW for the following candidate:
- Role applying for: ${role}
- Years of experience: ${experience}
- Topics to assess: ${topicsToFocus}
- Difficulty level: ${difficulty.toUpperCase()} — ${difficultyContext}

Your task:
Generate exactly ${numberOfQuestions} realistic interview questions that an interviewer would actually ask out loud, each paired with a strong model ("ideal") answer that will be used as the benchmark to score the candidate's spoken/typed response.

Rules:
- Questions must be answerable verbally in 1–3 minutes — no "write a 200-line program" tasks.
- Match the domain exactly. Do not assume software unless the role/topics clearly indicate it.
- Write each ideal answer as clear, natural prose — what a strong candidate would actually say.
- Use a code block ONLY if the question explicitly asks to write/trace/debug real code, wrapped as [CODE:language]...[/CODE].

JSON output rules (your output will be parsed by JSON.parse):
1. Return ONLY a valid JSON array. No markdown, no text outside the JSON.
2. Do NOT wrap output in code fences.
3. Never put a literal newline inside a JSON string value — use \\n instead.
4. Use only straight double quotes. No trailing commas.

Return this exact format:
[
  { "question": "The interview question here?", "answer": "The ideal model answer as prose." }
]`;
};

// ── 2. Evaluate a single candidate answer ────────────────────────────────────
const mockEvaluationPrompt = (question, idealAnswer, userAnswer, role, difficulty = "medium") => {
  return `You are a fair but rigorous interview coach evaluating a candidate's answer in a mock interview for the role of "${role}" (difficulty: ${difficulty}).

QUESTION:
"""${question}"""

IDEAL / BENCHMARK ANSWER (for your reference only — do not assume the candidate must match it word-for-word):
"""${idealAnswer || "No reference answer available — judge on general merit for this role."}"""

CANDIDATE'S ANSWER:
"""${userAnswer}"""

Evaluate the candidate's answer on correctness, depth, clarity, relevance, and structure. Be encouraging but honest. Award partial credit. A blank or off-topic answer scores low.

Scoring guide (0–100):
- 0–39: incorrect, missing, or largely off-topic
- 40–59: partially correct but shallow or with notable gaps
- 60–79: solid, mostly correct, room to deepen
- 80–100: strong, well-structured, interview-ready

JSON output rules (parsed by JSON.parse):
1. Return ONLY a valid JSON object. No markdown, no text outside the JSON.
2. Do NOT wrap output in code fences.
3. Never put a literal newline inside a JSON string value — use \\n instead.
4. Straight double quotes only. No trailing commas.
5. Keep each array to a maximum of 4 short items.

Return this exact format:
{
  "score": 73,
  "verdict": "One concise sentence summarising the answer's quality.",
  "strengths": ["What the candidate did well."],
  "improvements": ["Specific, actionable ways to improve."],
  "missedPoints": ["Key points the ideal answer covered that the candidate omitted."],
  "modelAnswer": "A concise, improved answer the candidate could have given, as prose."
}`;
};

// ── 3. Overall summary across the whole attempt ──────────────────────────────
const mockSummaryPrompt = (role, difficulty, perQuestion) => {
  const lines = perQuestion
    .map((q, i) => `Q${i + 1} (score ${q.score ?? 0}): ${q.verdict || "n/a"}`)
    .join("\\n");

  return `You are an interview coach writing a brief overall debrief for a candidate who just finished a mock interview for "${role}" (difficulty: ${difficulty}).

Here are the per-question results:
${lines}

Write a short, motivating but honest overall debrief.

JSON output rules (parsed by JSON.parse):
1. Return ONLY a valid JSON object. No markdown, no text outside the JSON.
2. Do NOT wrap output in code fences.
3. Never put a literal newline inside a JSON string value — use \\n instead.
4. Straight double quotes only. No trailing commas. Max 4 items per array.

Return this exact format:
{
  "overallVerdict": "One short sentence overall judgement.",
  "summary": "2-3 sentences of honest, encouraging feedback as prose.",
  "topStrengths": ["A recurring strength across answers."],
  "focusAreas": ["The most important area to work on next."]
}`;
};

module.exports = { mockQuestionsPrompt, mockEvaluationPrompt, mockSummaryPrompt };