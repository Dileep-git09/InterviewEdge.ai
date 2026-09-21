const { extractAndParseJSON, normaliseQuestionsArray } = require("../utils/gemini");

describe("extractAndParseJSON — 4-strategy cascade", () => {
  it("strategy 1: parses direct, clean JSON", () => {
    expect(extractAndParseJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it("strategy 2: strips markdown code fences", () => {
    expect(extractAndParseJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractAndParseJSON("```\n[1,2,3]\n```")).toEqual([1, 2, 3]);
  });

  it("strategy 3: extracts the outermost JSON block from surrounding prose", () => {
    const raw = 'Sure, here is the JSON you asked for:\n{"a":1,"b":[1,2]}\nLet me know if you need more.';
    expect(extractAndParseJSON(raw)).toEqual({ a: 1, b: [1, 2] });
  });

  it("strategy 4: sanitises trailing commas", () => {
    expect(extractAndParseJSON('{"a":1,"b":2,}')).toEqual({ a: 1, b: 2 });
  });

  it("throws a clear error on an empty response", () => {
    expect(() => extractAndParseJSON("")).toThrow(/empty/i);
    expect(() => extractAndParseJSON("   ")).toThrow(/empty/i);
  });

  it("throws when nothing is recoverable", () => {
    expect(() => extractAndParseJSON("this is not json at all, no braces here")).toThrow();
  });
});

describe("normaliseQuestionsArray — real shapes confirmed live from Gemini/Groq", () => {
  it("passes through a bare array unchanged (the documented/requested shape)", () => {
    const arr = [{ question: "Q1", answer: "A1" }, { question: "Q2", answer: "A2" }];
    expect(normaliseQuestionsArray(arr)).toBe(arr);
  });

  it("unwraps { questions: [...] }", () => {
    const arr = [{ question: "Q1", answer: "A1" }];
    expect(normaliseQuestionsArray({ questions: arr })).toBe(arr);
  });

  it("wraps a single collapsed { question, answer } object in an array — the shape " +
     "confirmed live from Groq's openai/gpt-oss-120b, which caused a production 500", () => {
    const single = { question: "Q1", answer: "A1" };
    expect(normaliseQuestionsArray(single)).toEqual([single]);
  });

  it("returns null for a genuinely unrecognisable shape", () => {
    expect(normaliseQuestionsArray({ result: "not questions" })).toBeNull();
    expect(normaliseQuestionsArray(null)).toBeNull();
    expect(normaliseQuestionsArray("a string")).toBeNull();
  });
});
