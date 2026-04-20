import React, { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuPin, LuPinOff, LuSparkles } from "react-icons/lu";
import AnswerRenderer from "../AnswerRenderer";

const DIFFICULTY_STYLES = {
  easy:   "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  hard:   "bg-red-100 text-red-800",
};

const QuestionCard = ({
  question,
  answer,
  onLearnMore,
  isPinned,
  onTogglePin,
  difficulty,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight]         = useState(0);
  const contentRef                  = useRef(null);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight + 20);
    } else {
      setHeight(0);
    }
  }, [isExpanded, answer]);

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  const difficultyLabel = difficulty
    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
    : null;

  const difficultyStyle = difficulty
    ? DIFFICULTY_STYLES[difficulty] || "bg-gray-100 text-gray-700"
    : null;

  return (
    <div className="bg-white rounded-xl shadow-md px-5 py-4 mb-6 md:mx-4">
      <div className="flex justify-between items-start">

        {/* Question text + difficulty badge */}
        <div
          className="flex items-start gap-3 cursor-pointer flex-1"
          onClick={toggleExpand}
        >
          <span className="text-xs md:text-sm font-semibold text-gray-400 mt-[2px]">
            Q
          </span>
          <div className="flex-1">
            <h3 className="text-sm md:text-base font-medium text-gray-800 leading-snug">
              {question}
            </h3>
            {difficultyLabel && (
              <span
                className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${difficultyStyle}`}
              >
                {difficultyLabel}
              </span>
            )}
          </div>
        </div>

        {/* Pin + expand/collapse */}
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

      {/* Collapsible answer panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="mt-4 bg-gray-50 text-sm md:text-base text-gray-700 px-4 py-3 rounded-md"
        >
          <AnswerRenderer answer={answer} />

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