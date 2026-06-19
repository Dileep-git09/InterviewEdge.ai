import React, { useEffect, useRef, useState } from "react";
import { LuChevronDown, LuFlame, LuUsers, LuBadgeCheck } from "react-icons/lu";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import AnswerRenderer from "../AnswerRenderer";

// ── Source badge ─────────────────────────────────────────────────────────────
const SourceBadge = ({ source }) => {
  if (source === "seeded") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <LuBadgeCheck size={10} />
        Real-world
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
      <LuUsers size={10} />
      Community
    </span>
  );
};

// ── Single collapsible question card ─────────────────────────────────────────
const TopQuestionCard = ({ question, answer, source, uniqueUserPins, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight]         = useState(0);
  const contentRef                  = useRef(null);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight + 16);
    } else {
      setHeight(0);
    }
  }, [isExpanded, answer]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 mb-3 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setIsExpanded((p) => !p)}
      >
        {/* Index number */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>

        <p className="flex-1 text-sm font-medium text-gray-800 leading-snug">
          {question}
        </p>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Community pin count */}
          {uniqueUserPins > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-gray-400">
              <LuUsers size={10} />
              {uniqueUserPins}
            </span>
          )}
          <LuChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Source badge row */}
      <div className="flex items-center gap-2 mt-2 ml-9">
        <SourceBadge source={source} />
      </div>

      {/* Collapsible answer */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="mt-3 pt-3 border-t border-gray-100 ml-9 text-sm text-gray-600"
        >
          <AnswerRenderer answer={answer} />
        </div>
      </div>
    </div>
  );
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="animate-pulse space-y-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-xl px-5 py-4">
        <div className="flex gap-3">
          <div className="w-6 h-6 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ── TopQuestionsPanel — main export ──────────────────────────────────────────
const TopQuestionsPanel = ({ role }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!role) return;

    const fetchTopQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get(
          API_PATHS.TOP_QUESTIONS.GET(role, 10)
        );
        setQuestions(response.data.questions || []);
      } catch (err) {
        setError("Could not load top questions.");
        console.error("TopQuestions fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTopQuestions();
  }, [role]);

  // Don't render the panel if there are no questions and we're not loading
  if (!loading && !error && questions.length === 0) return null;

  return (
    <div className="mb-10 md:mx-4">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-4">
        <LuFlame size={18} className="text-orange-500" />
        <h2 className="text-base font-semibold text-gray-900">
          Most Important Questions
        </h2>
        <span className="text-xs text-gray-400 font-medium">
          — real-world &amp; community-pinned for this role
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        These questions are sourced from real-world interview scenarios and the
        most frequently pinned questions by other candidates preparing for the
        same role. They reflect what interviewers actually ask.
      </p>

      {/* Content */}
      {loading && <Skeleton />}

      {error && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {!loading && !error && questions.map((q, i) => (
        <TopQuestionCard
          key={i}
          index={i}
          question={q.question}
          answer={q.answer}
          source={q.source}
          uniqueUserPins={q.uniqueUserPins}
        />
      ))}
    </div>
  );
};

export default TopQuestionsPanel;