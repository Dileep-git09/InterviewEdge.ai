import React, { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuPin, LuPinOff, LuSparkles } from "react-icons/lu";

// Component to format answer text
const FormattedAnswer = ({ answer }) => {
  if (!answer) return null;

  // Function to handle inline formatting
  const formatInlineText = (text) => {
    if (!text) return "";

    // Handle inline code (`code`)
    let formatted = text.replace(
      /`([^`]+)`/g,
      '<code class="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono text-red-600">$1</code>'
    );

    // Handle bold (**text**)
    formatted = formatted.replace(
      /\*\*([^\*]+)\*\*/g,
      '<strong class="font-semibold text-gray-800">$1</strong>'
    );

    // Handle italic (*text*)
    formatted = formatted.replace(
      /\*([^\*]+)\*/g,
      '<em class="italic text-gray-700">$1</em>'
    );

    return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  // Split answer into paragraphs and format each
  const paragraphs = answer.split("\n\n").filter((p) => p.trim());

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        // Handle bullet points (lines starting with - or *)
        if (
          paragraph.includes("\n-") ||
          paragraph.includes("\n*") ||
          paragraph.startsWith("-") ||
          paragraph.startsWith("*")
        ) {
          const lines = paragraph.split("\n");
          const nonBulletLines = [];
          const bulletPoints = [];

          lines.forEach((line) => {
            if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
              bulletPoints.push(line.trim().substring(1).trim());
            } else if (line.trim()) {
              nonBulletLines.push(line.trim());
            }
          });

          return (
            <div key={index}>
              {nonBulletLines.map((line, lineIndex) => (
                <p key={lineIndex} className="mb-2">
                  {formatInlineText(line)}
                </p>
              ))}
              {bulletPoints.length > 0 && (
                <ul className="list-disc list-inside space-y-1 ml-2">
                  {bulletPoints.map((point, pointIndex) => (
                    <li key={pointIndex} className="text-gray-700">
                      {formatInlineText(point)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }

        // Handle numbered lists (lines starting with 1. 2. etc.)
        if (paragraph.match(/^\d+\./m)) {
          const lines = paragraph.split("\n");
          const nonNumberedLines = [];
          const numberedPoints = [];

          lines.forEach((line) => {
            if (line.trim().match(/^\d+\./)) {
              numberedPoints.push(line.trim().replace(/^\d+\.\s*/, ""));
            } else if (line.trim()) {
              nonNumberedLines.push(line.trim());
            }
          });

          return (
            <div key={index}>
              {nonNumberedLines.map((line, lineIndex) => (
                <p key={lineIndex} className="mb-2">
                  {formatInlineText(line)}
                </p>
              ))}
              {numberedPoints.length > 0 && (
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  {numberedPoints.map((point, pointIndex) => (
                    <li key={pointIndex} className="text-gray-700">
                      {formatInlineText(point)}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        }

        // Handle code blocks (indented lines or lines with multiple spaces)
        if (
          paragraph.includes("    ") ||
          paragraph.split("\n").some((line) => line.startsWith("    "))
        ) {
          return (
            <div key={index} className="bg-gray-800 rounded-md p-3 my-3">
              <pre className="text-sm text-gray-100 whitespace-pre-wrap overflow-x-auto">
                <code>{paragraph.trim()}</code>
              </pre>
            </div>
          );
        }

        // Regular paragraph with line breaks
        const lines = paragraph.split("\n").filter((line) => line.trim());
        return (
          <div key={index}>
            {lines.map((line, lineIndex) => (
              <p key={lineIndex} className="mb-1 last:mb-0">
                {formatInlineText(line.trim())}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const QuestionCard = ({
  question,
  answer,
  onLearnMore,
  isPinned,
  onTogglePin,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight + 20); // extra padding
    } else {
      setHeight(0);
    }
  }, [isExpanded]);

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <div className="bg-white rounded-xl shadow-md px-5 py-4 mb-6 md:mx-4">
      <div className="flex justify-between items-start">
        {/* Question Section */}
        <div
          className="flex items-start gap-3 cursor-pointer flex-1"
          onClick={toggleExpand}
        >
          <span className="text-xs md:text-sm font-semibold text-gray-400 mt-[2px]">
            Q
          </span>
          <h3 className="text-sm md:text-base font-medium text-gray-800 leading-snug">
            {question}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4 mt-1">
          <button
            className="text-indigo-700 hover:text-indigo-500"
            onClick={onTogglePin}
          >
            {isPinned ? <LuPinOff size={16} /> : <LuPin size={16} />}
          </button>

          <button
            className="text-gray-500 hover:text-gray-700 transform transition-transform duration-300"
            onClick={toggleExpand}
          >
            <LuChevronDown
              size={18}
              className={`${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Collapsible Answer */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="mt-4 bg-gray-50 text-sm md:text-base text-gray-700 px-4 py-3 rounded-md"
        >
          {/* Formatted Answer Content */}
          <FormattedAnswer answer={answer} />

          <button
            onClick={() => {
              setIsExpanded(true);
              onLearnMore();
            }}
            className="mt-3 inline-flex items-center text-indigo-600 hover:underline text-xs md:text-sm font-medium transition-colors"
          >
            <LuSparkles className="mr-1" size={14} />
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
