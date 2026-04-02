import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, FileText, AlertCircle, ChevronDown, Sparkles } from "lucide-react";
import DashboardLayout from "../../components/Layouts/DashboardLayout";

// ── Section colour map ────────────────────────────────────────────────────────
// Maps common section names to a Tailwind colour pair [header bg, badge]
const SECTION_COLORS = {
  skills:           { bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-800",   dot: "bg-blue-500"   },
  experience:       { bg: "bg-purple-50", badge: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  projects:         { bg: "bg-green-50",  badge: "bg-green-100 text-green-800",  dot: "bg-green-500"  },
  certifications:   { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  certification:    { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  education:        { bg: "bg-orange-50", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  achievements:     { bg: "bg-pink-50",   badge: "bg-pink-100 text-pink-800",    dot: "bg-pink-500"   },
  summary:          { bg: "bg-teal-50",   badge: "bg-teal-100 text-teal-800",    dot: "bg-teal-500"   },
};

const getSectionColor = (sectionName) => {
  const key = sectionName?.toLowerCase().trim();
  return (
    SECTION_COLORS[key] || {
      bg: "bg-gray-50",
      badge: "bg-gray-100 text-gray-700",
      dot: "bg-gray-400",
    }
  );
};

// ── Single collapsible question card ─────────────────────────────────────────
const QuestionCard = ({ question, answer, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight + 16);
    } else {
      setHeight(0);
    }
  }, [isExpanded, answer]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 mb-3">
      {/* Question row */}
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setIsExpanded((p) => !p)}
      >
        <span className="text-xs font-bold text-gray-400 mt-0.5 flex-shrink-0">
          Q{index + 1}
        </span>
        <p className="flex-1 text-sm font-medium text-gray-800 leading-snug">
          {question}
        </p>
        <ChevronDown
          size={16}
          className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Collapsible answer */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: `${height}px` }}
      >
        <div
          ref={contentRef}
          className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-3"
        >
          <span className="text-xs font-bold text-indigo-400 mt-0.5 flex-shrink-0">A</span>
          <p className="text-sm text-gray-600 leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  );
};

// ── Section block ─────────────────────────────────────────────────────────────
const SectionBlock = ({ section, questions }) => {
  const color = getSectionColor(section);

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${color.bg}`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} />
        <h3 className="text-base font-semibold text-gray-800">{section}</h3>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${color.badge}`}>
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <QuestionCard
          key={i}
          index={i}
          question={q.question}
          answer={q.answer}
        />
      ))}
    </div>
  );
};

// ── ResumePrep page ───────────────────────────────────────────────────────────
const ResumePrep = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { sections, fileName }
  const [error, setError] = useState(null);

  useEffect(() => {
    // Read the questions stored by ProfileInfoCard after upload
    const stored = sessionStorage.getItem("resumeQuestions");
    if (!stored) {
      setError("No resume data found. Please upload your resume first.");
      return;
    }
    try {
      setData(JSON.parse(stored));
    } catch {
      setError("Failed to load resume questions. Please try uploading again.");
    }
  }, []);

  const totalQuestions = data?.sections?.reduce(
    (acc, s) => acc + s.questions.length,
    0
  ) ?? 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 md:px-8 pt-6 pb-12 max-w-3xl">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          {/* Back button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mb-4 transition-colors group"
          >
            <ChevronLeft
              size={14}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText size={22} className="text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Resume Interview Prep
              </h1>
              {data?.fileName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Based on{" "}
                  <span className="font-medium text-gray-700">
                    {data.fileName}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Summary strip */}
          {data && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                <Sparkles size={12} className="text-blue-500" />
                {data.sections.length} section
                {data.sections.length !== 1 ? "s" : ""} detected
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                {totalQuestions} questions generated
              </div>
            </div>
          )}
        </div>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Something went wrong</p>
              <p className="mt-0.5 text-red-600">{error}</p>
              <button
                onClick={() => navigate("/dashboard")}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
              >
                Go to Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* ── Questions by section ────────────────────────────────────────── */}
        {data?.sections?.map((s, i) => (
          <SectionBlock
            key={i}
            section={s.section}
            questions={s.questions}
          />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ResumePrep;