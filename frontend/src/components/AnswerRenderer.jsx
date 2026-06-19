import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { LuCopy, LuCheck } from "react-icons/lu";

// ── Language aliases ─────────────────────────────────────────────────────────
const LANG_ALIASES = {
  js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
  py: "python", rb: "ruby", sh: "bash", shell: "bash", zsh: "bash",
  yml: "yaml", html: "html", css: "css", sql: "sql", json: "json",
  java: "java", cpp: "cpp", "c++": "cpp", c: "c", cs: "csharp",
  go: "go", rs: "rust", php: "php", kt: "kotlin", swift: "swift",
};

const normaliseLanguage = (lang = "") => {
  const lower = lang.toLowerCase().trim();
  // Bug fix: old code defaulted to "javascript" which caused any unrecognised
  // lang to be syntax-highlighted as JS. Use "text" for plain output instead.
  return LANG_ALIASES[lower] || lower || "text";
};

// ── CodeBlock — ChatGPT-style block with language label + copy button ────────
export const CodeBlock = ({ code, language = "text" }) => {
  const [copied, setCopied] = useState(false);
  const lang = normaliseLanguage(language);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-gray-700 text-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#282c34]">
        <span className="text-xs text-gray-400 font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors duration-150"
          title="Copy code"
        >
          {copied ? (
            <>
              <LuCheck size={13} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <LuCopy size={13} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax-highlighted code */}
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{
          margin: 0, borderRadius: 0, fontSize: "0.8rem",
          lineHeight: "1.6", padding: "1rem 1.25rem", background: "#1e2127",
        }}
        showLineNumbers={code.split("\n").length > 4}
        lineNumberStyle={{ color: "#4b5363", fontSize: "0.7rem" }}
        wrapLongLines
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
};

// ── formatInlineText — `inline code`, **bold**, *italic* ────────────────────
const formatInlineText = (text) => {
  if (!text) return null;

  const html = text
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono text-red-600">$1</code>'
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};

// ── parseSegments ────────────────────────────────────────────────────────────
// Splits the answer string into typed segments:
//   { type: "code", language, code }
//   { type: "text", content }
//
// Recognises two explicit code markers:
//   1. [CODE:lang]...code...[/CODE]  — our prompt's deliberate marker
//   2. ```lang\n...code\n```         — standard markdown (for legacy data)
//
// NOTHING ELSE produces a code block. The old "looksLikeCode" heuristic has
// been completely removed — it was the root cause of non-tech answers
// (biology, civil engineering, teaching, etc.) being rendered as code blocks.
// ─────────────────────────────────────────────────────────────────────────────
const parseSegments = (answer) => {
  if (!answer) return [];

  const segments = [];

  // Matches [CODE:lang]...[/CODE]  OR  ```lang\n...```
  const codeRegex = /\[CODE:(\w*)\]([\s\S]*?)\[\/CODE\]|```(\w*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(answer)) !== null) {
    // Text before this block
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: answer.slice(lastIndex, match.index) });
    }

    const isCustom  = match[1] !== undefined;
    const language  = isCustom ? match[1] : match[3];
    const code      = isCustom ? match[2] : match[4];

    segments.push({ type: "code", language: language || "text", code });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block (or whole string if no code found)
  if (lastIndex < answer.length) {
    segments.push({ type: "text", content: answer.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", content: answer }];
};

// ── renderTextSegment ────────────────────────────────────────────────────────
// Renders a plain-text segment as paragraphs, bullet lists, or numbered lists.
// No code-detection heuristics — only the explicit markers above produce code.
// ─────────────────────────────────────────────────────────────────────────────
const renderTextSegment = (content, segmentKey) => {
  if (!content || !content.trim()) return null;

  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());

  return paragraphs.map((para, pIdx) => {
    const key = `${segmentKey}-p${pIdx}`;
    const lines = para.split("\n").filter((l) => l.trim());

    // ── Bullet list ───────────────────────────────────────────────────────
    const isBullet = (l) => /^[-*•]\s/.test(l.trim());
    if (lines.some(isBullet)) {
      const bullets = [];
      const prose   = [];
      lines.forEach((l) => {
        if (isBullet(l)) bullets.push(l.trim().replace(/^[-*•]\s/, ""));
        else if (l.trim()) prose.push(l.trim());
      });
      return (
        <div key={key} className="mb-3">
          {prose.map((l, i) => (
            <p key={i} className="mb-1 leading-relaxed">{formatInlineText(l)}</p>
          ))}
          {bullets.length > 0 && (
            <ul className="list-disc list-inside space-y-1 ml-2 mt-1">
              {bullets.map((b, i) => (
                <li key={i} className="text-gray-700 leading-relaxed">{formatInlineText(b)}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    // ── Numbered list ─────────────────────────────────────────────────────
    const isNumbered = (l) => /^\d+\.\s/.test(l.trim());
    if (lines.some(isNumbered)) {
      const items = [];
      const prose = [];
      lines.forEach((l) => {
        if (isNumbered(l)) items.push(l.trim().replace(/^\d+\.\s/, ""));
        else if (l.trim()) prose.push(l.trim());
      });
      return (
        <div key={key} className="mb-3">
          {prose.map((l, i) => (
            <p key={i} className="mb-1 leading-relaxed">{formatInlineText(l)}</p>
          ))}
          {items.length > 0 && (
            <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
              {items.map((item, i) => (
                <li key={i} className="text-gray-700 leading-relaxed">{formatInlineText(item)}</li>
              ))}
            </ol>
          )}
        </div>
      );
    }

    // ── Regular paragraph ─────────────────────────────────────────────────
    return (
      <div key={key} className="mb-3">
        {lines.map((l, i) => (
          <p key={i} className="mb-1 last:mb-0 leading-relaxed">
            {formatInlineText(l.trim())}
          </p>
        ))}
      </div>
    );
  });
};

// ── AnswerRenderer — main export ─────────────────────────────────────────────
const AnswerRenderer = ({ answer }) => {
  if (!answer) return null;

  const segments = parseSegments(answer);

  return (
    <div className="space-y-1">
      {segments.map((seg, i) =>
        seg.type === "code"
          ? <CodeBlock key={i} code={seg.code} language={seg.language} />
          : renderTextSegment(seg.content, i)
      )}
    </div>
  );
};

export default AnswerRenderer;