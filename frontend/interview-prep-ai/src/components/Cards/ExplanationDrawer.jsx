import React from "react";
import { motion } from "framer-motion";
import { LuCircleAlert, LuListCollapse } from "react-icons/lu";

// A simple loading skeleton component
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
    <div className="h-4 bg-gray-300 rounded w-full"></div>
    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    <div className="mt-6 h-4 bg-gray-300 rounded w-1/2"></div>
    <div className="h-20 bg-gray-300 rounded"></div>
  </div>
);

// Markdown formatter component
const FormattedContent = ({ content }) => {
  if (!content) return null;

  // Function to parse and format the explanation content
  const formatContent = (text) => {
    if (!text) return null;

    // Split by double line breaks to get paragraphs
    const sections = text.split("\n\n");

    return sections.map((section, index) => {
      // Handle headers (lines starting with **)
      if (section.startsWith("**") && section.includes("**")) {
        const headerMatch = section.match(/\*\*(.*?)\*\*/);
        if (headerMatch) {
          const headerText = headerMatch[1];
          const remainingText = section.replace(/\*\*(.*?)\*\*/, "").trim();

          return (
            <div key={index} className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                {headerText}
              </h2>
              {remainingText && (
                <p className="text-gray-700 leading-relaxed">
                  {formatInlineText(remainingText)}
                </p>
              )}
            </div>
          );
        }
      }

      // Handle subheaders (lines starting with **What)
      if (
        section.includes("**What") ||
        section.includes("**Key") ||
        section.includes("**Example")
      ) {
        const parts = section.split("**");
        return (
          <div key={index} className="mb-4">
            {parts.map((part, partIndex) => {
              if (partIndex % 2 === 1) {
                // This is a bold part (header)
                return (
                  <h3
                    key={partIndex}
                    className="text-lg font-semibold text-gray-800 mb-2"
                  >
                    {part}
                  </h3>
                );
              } else if (part.trim()) {
                // This is regular text
                return (
                  <p
                    key={partIndex}
                    className="text-gray-700 leading-relaxed mb-2"
                  >
                    {formatInlineText(part.trim())}
                  </p>
                );
              }
              return null;
            })}
          </div>
        );
      }

      // Handle bullet points (lines starting with ***)
      if (section.includes("***")) {
        const bulletPoints = section
          .split("***")
          .filter((point) => point.trim());
        return (
          <div key={index} className="mb-4">
            <ul className="space-y-2">
              {bulletPoints.map((point, pointIndex) => {
                const [term, description] = point.split(":");
                return (
                  <li key={pointIndex} className="flex">
                    <span className="font-semibold text-blue-600 mr-2">
                      {term.trim()}:
                    </span>
                    <span className="text-gray-700">
                      {description ? description.trim() : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      }

      // Handle table-like content (lines with |)
      if (section.includes("|")) {
        const lines = section.split("\n").filter((line) => line.includes("|"));
        if (lines.length > 1) {
          const headers = lines[0]
            .split("|")
            .map((h) => h.trim())
            .filter((h) => h);
          const rows = lines.slice(2).map((line) =>
            line
              .split("|")
              .map((cell) => cell.trim())
              .filter((cell) => cell)
          );

          return (
            <div key={index} className="mb-6 overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, headerIndex) => (
                      <th
                        key={headerIndex}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 text-sm text-gray-700 border-b"
                        >
                          {formatInlineText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Handle code blocks (lines starting with ```)
      if (section.includes("```")) {
        // Handle multiple formats of code blocks
        const codeMatch = section.match(/```(\w+)?\s*([\s\S]*?)```/s);
        if (codeMatch) {
          const language = codeMatch[1] || "javascript";
          const code = codeMatch[2].trim();
          const beforeCode = section
            .substring(0, section.indexOf("```"))
            .trim();
          const afterCode = section
            .substring(section.lastIndexOf("```") + 3)
            .trim();

          return (
            <div key={index} className="mb-6">
              {beforeCode && (
                <p className="text-gray-700 leading-relaxed mb-3">
                  {formatInlineText(beforeCode)}
                </p>
              )}
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">
                    {language}
                  </span>
                </div>
                <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                  <code>{code}</code>
                </pre>
              </div>
              {afterCode && (
                <p className="text-gray-700 leading-relaxed mt-3">
                  {formatInlineText(afterCode)}
                </p>
              )}
            </div>
          );
        }
      }

      // Handle code-like content (detect function declarations, JSX, etc.)
      if (
        section.includes("function ") ||
        section.includes("return") ||
        section.includes("ReactDOM.render") ||
        section.includes("=>") ||
        section.match(/^\s*\/\//m)
      ) {
        return (
          <div key={index} className="mb-6">
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  javascript
                </span>
              </div>
              <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                <code>{section.trim()}</code>
              </pre>
            </div>
          </div>
        );
      }

      // Regular paragraph
      if (section.trim()) {
        return (
          <p key={index} className="text-gray-700 leading-relaxed mb-4">
            {formatInlineText(section.trim())}
          </p>
        );
      }

      return null;
    });
  };

  // Function to handle inline formatting (bold, italic, code)
  const formatInlineText = (text) => {
    if (!text) return "";

    // Handle inline code (`code`)
    let formatted = text.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-600">$1</code>'
    );

    // Handle bold (**text**)
    formatted = formatted.replace(
      /\*\*([^\*]+)\*\*/g,
      '<strong class="font-semibold text-gray-800">$1</strong>'
    );

    // Handle italic (*text*)
    formatted = formatted.replace(
      /\*([^\*]+)\*/g,
      '<em class="italic">$1</em>'
    );

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Extract content from different response structures
  const getContent = (data) => {
    if (typeof data === "string") return data;
    if (data?.explanation) return data.explanation;
    if (data?.content) return data.content;
    if (data?.data?.explanation) return data.data.explanation;
    if (data?.message) return data.message;
    return JSON.stringify(data, null, 2);
  };

  return <div className="max-w-none">{formatContent(getContent(content))}</div>;
};

const ExplanationDrawer = ({ data, isLoading, error, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto p-5 border-l border-gray-200 bg-white shadow-sm rounded-lg xl:mr-8"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">Learn More</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Collapse panel"
        >
          <LuListCollapse size={22} />
        </button>
      </div>

      <div className="prose prose-sm max-w-none">
        {isLoading && <SkeletonLoader />}

        {error && !isLoading && (
          <div className="flex items-center space-x-2 text-red-600 p-3 bg-red-50 rounded-lg">
            <LuCircleAlert size={20} />
            <p>{error}</p>
          </div>
        )}

        {data && !isLoading && !error && (
          <div className="space-y-5">
            <FormattedContent content={data} />
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              Click "Learn More" on any question to get detailed explanations
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ExplanationDrawer;
