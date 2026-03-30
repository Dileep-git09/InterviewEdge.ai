const DIFFICULTY_CONTEXT = {
  easy: "beginner-friendly, conceptual or definitional, suitable for someone just starting out — no complex implementation required",
  medium:
    "intermediate level, requiring applied knowledge, practical examples, or moderate problem-solving skills",
  hard: "advanced level, requiring deep expertise, architecture tradeoffs, system design understanding, or complex implementation",
};

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

module.exports = { questionAnswerPrompt, conceptExplainPrompt };









// const questionAnswerPrompt = (
//   role,
//   experience,
//   topicsToFocus,
//   numberOfQuestions
// ) => {
//   return `You are an AI trained to generate technical interview questions and answers.

// Task:
// - Role: ${role}
// - Candidate Experience: ${experience} years
// - Focus Topics: ${topicsToFocus}
// - Write ${numberOfQuestions} interview questions.
// - For each question, generate a detailed but beginner-friendly answer.
// - If the answer needs a code example, add a small code block inside.
// - Keep formatting very clean.
// - Return a pure JSON array like:

// [
//   {
//     "question": "Question here?",
//     "answer": "Answer here."
//   },
//   ...
// ]

// Important: Do NOT add any extra text. Only return valid JSON.`;
// };

// const conceptExplainPrompt = (question) => {
//   return `You are an AI trained to generate explanations for a given interview question.

// Task:
// - Explain the following interview question and its concept in depth as if you're teaching a beginner developer.
// - Question: "${question}"
// - After the explanation, provide a short and clear title that summarizes the concept for the article or page header.
// - If the explanation includes a code example, provide a small code block.
// - Keep the formatting very clean and clear.
// - Return the result as a valid JSON object in the following format:

// {
//   "title": "Short title here?",
//   "explanation": "Explanation here."
// }

// Important: Do NOT add any extra text outside the JSON format. Only return valid JSON.`;
// };

// module.exports = { questionAnswerPrompt, conceptExplainPrompt };
