const { GoogleGenAI } = require("@google/genai");

// ─────────────────────────────────────────────────────────────────────────────
// Shared AI helper — Gemini primary, Groq fallback
//
// Primary  : Gemini 2.5 Flash  (Google AI Studio free tier — 1,500 req/day)
// Fallback : Llama 3.3 70B via Groq (free tier — 1,000 req/day, no card)
//
// Flow:
//   1. Call Gemini 2.5 Flash.
//   2. If Gemini fails with a quota/rate-limit/auth/outage error → retry via Groq.
//   3. If both fail → throw a combined error message.
//
// ENV vars needed:
//   GEMINI_API_KEY  — from https://aistudio.google.com/app/apikey  (free)
//   GROQ_API_KEY    — from https://console.groq.com               (free, no card)
// ─────────────────────────────────────────────────────────────────────────────

// ── Gemini client ─────────────────────────────────────────────────────────────
const geminiAI    = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
// gemini-2.5-flash was retired by Google (API now 404s: "no longer available
// to new users, use gemini-3.6-flash") — confirmed live against the API.
const GEMINI_MODEL = "gemini-3.6-flash";

// ── Groq client (OpenAI-compatible REST) ──────────────────────────────────────
// llama-3.3-70b-versatile was retired from Groq's lineup (404s "does not
// exist"). Confirmed openai/gpt-oss-120b is live, follows plain-JSON
// instructions cleanly, and needs no markdown-fence stripping.
const GROQ_MODEL   = "openai/gpt-oss-120b";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ── 4-strategy JSON cascade ───────────────────────────────────────────────────
// Handles both Gemini's and Groq's inconsistent output formatting.
const extractAndParseJSON = (rawText) => {
  if (!rawText || !rawText.trim()) {
    throw new Error("AI returned an empty response.");
  }

  // Strategy 1: direct parse
  try { return JSON.parse(rawText.trim()); } catch (_) {}

  // Strategy 2: strip outer markdown fences
  const stripped = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try { return JSON.parse(stripped); } catch (_) {}

  // Strategy 3: bracket-depth scan — find outermost [ ] or { }
  const extractOutermostBlock = (text) => {
    for (let i = 0; i < text.length; i++) {
      const startChar = text[i];
      if (startChar !== "[" && startChar !== "{") continue;
      const closeChar = startChar === "[" ? "]" : "}";
      let depth = 0, inString = false, escape = false;
      for (let j = i; j < text.length; j++) {
        const c = text[j];
        if (escape) { escape = false; continue; }
        if (c === "\\" && inString) { escape = true; continue; }
        if (c === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (c === startChar) depth++;
        else if (c === closeChar) { depth--; if (depth === 0) return text.slice(i, j + 1); }
      }
    }
    return null;
  };

  const block = extractOutermostBlock(rawText);
  if (block) { try { return JSON.parse(block); } catch (_) {} }

  // Strategy 4: sanitise then parse
  const sanitise = (text) => {
    const candidate = block || stripped || text;
    return candidate
      .replace(/```[\w]*\n([\s\S]*?)```/g, (_, code) =>
        code.replace(/\n/g, "\\n").replace(/"/g, '\\"')
      )
      .replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
        match
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r")
          .replace(/\t/g, "\\t")
      )
      .replace(/,\s*([}\]])/g, "$1");
  };

  try { return JSON.parse(sanitise(rawText)); } catch (finalErr) {
    console.error("─── AI raw response (parse failed) ───");
    console.error(rawText.slice(0, 500));
    console.error("───────────────────────────────────────");
    throw new Error(
      `AI returned malformed JSON and all recovery strategies failed. Original error: ${finalErr.message}`
    );
  }
};

// ── Call Gemini (primary) ─────────────────────────────────────────────────────
const callGemini = async (prompt) => {
  const response = await geminiAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!rawText) throw new Error("Empty response from Gemini API");
  return rawText;
};

// ── Call Groq (fallback) ──────────────────────────────────────────────────────
const callGroq = async (prompt) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set — cannot use Groq as fallback.");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Groq API error ${response.status}: ${errBody}`);
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || "";
  if (!rawText) throw new Error("Empty response from Groq API");
  return rawText;
};

// ── Determine if a Gemini error should trigger the Groq fallback ──────────────
// Triggers on: quota exhausted, rate limits, bad/expired key, outage errors.
// Does NOT trigger on prompt/content errors — those surface directly.
const isGeminiTransientError = (err) => {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("500") ||
    msg.includes("503") ||
    msg.includes("service unavailable") ||
    msg.includes("api key") ||
    msg.includes("empty response")
  );
};

// ── callAIForJSON — used by all controllers for JSON responses ────────────────
const callAIForJSON = async (prompt) => {
  let rawText;

  try {
    rawText = await callGemini(prompt);
    console.log("[AI] Gemini responded OK");
  } catch (geminiErr) {
    if (isGeminiTransientError(geminiErr)) {
      console.warn(`[AI] Gemini failed — falling back to Groq`);
      try {
        rawText = await callGroq(prompt);
        console.log("[AI] Groq fallback responded OK");
      } catch (groqErr) {
        throw new Error(
          `Both Gemini and Groq failed.\nGemini: ${geminiErr.message}\nGroq: ${groqErr.message}`
        );
      }
    } else {
      throw geminiErr;
    }
  }

  return extractAndParseJSON(rawText);
};

// ── callAIForText — same fallback logic but returns raw text ──────────────────
// Used for free-form summaries that don't need JSON parsing.
const callAIForText = async (prompt) => {
  try {
    const text = await callGemini(prompt);
    console.log("[AI] Gemini text responded OK");
    return text;
  } catch (geminiErr) {
    if (isGeminiTransientError(geminiErr)) {
      console.warn(`[AI] Gemini text failed — falling back to Groq`);
      return await callGroq(prompt);
    }
    throw geminiErr;
  }
};

// ── Legacy aliases — backward-compatible with mockInterviewController ─────────
const callGeminiForJSON = callAIForJSON;
const callGeminiForText = callAIForText;

module.exports = {
  callAIForJSON,
  callAIForText,
  callGeminiForJSON,
  callGeminiForText,
  extractAndParseJSON,
  GEMINI_MODEL,
  GROQ_MODEL,
};