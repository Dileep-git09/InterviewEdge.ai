import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, FileText, AlertCircle,
  ChevronDown, Sparkles, Pin, PinOff,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import AnswerRenderer from "../../components/AnswerRenderer";

// ── Section colour map ────────────────────────────────────────────────────────
const SECTION_COLORS = {
  skills:         { bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-800",     dot: "bg-blue-500"   },
  experience:     { bg: "bg-purple-50", badge: "bg-purple-100 text-purple-800", dot: "bg-purple-500" },
  projects:       { bg: "bg-green-50",  badge: "bg-green-100 text-green-800",   dot: "bg-green-500"  },
  certifications: { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  certification:  { bg: "bg-yellow-50", badge: "bg-yellow-100 text-yellow-800", dot: "bg-yellow-500" },
  education:      { bg: "bg-orange-50", badge: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  achievements:   { bg: "bg-pink-50",   badge: "bg-pink-100 text-pink-800",     dot: "bg-pink-500"   },
  summary:        { bg: "bg-teal-50",   badge: "bg-teal-100 text-teal-800",     dot: "bg-teal-500"   },
};

const getSectionColor = (name = "") => {
  const key = name.toLowerCase().trim();
  return SECTION_COLORS[key] || {
    bg: "bg-gray-50",
    badge: "bg-gray-100 text-gray-700",
    dot: "bg-gray-400",
  };
};

// ── Single collapsible question card ─────────────────────────────────────────
const QuestionCard = ({ questionDoc, index, onTogglePin }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight]         = useState(0);
  const contentRef                  = useRef(null);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setHeight(contentRef.current.scrollHeight + 16);
    } else {
      setHeight(0);
    }
  }, [isExpanded, questionDoc.answer]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 mb-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        <span
          className="text-xs font-bold text-gray-400 mt-0.5 flex-shrink-0 cursor-pointer"
          onClick={() => setIsExpanded((p) => !p)}
        >
          Q{index + 1}
        </span>

        <p
          className="flex-1 text-sm font-medium text-gray-800 leading-snug cursor-pointer"
          onClick={() => setIsExpanded((p) => !p)}
        >
          {questionDoc.question}
        </p>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onTogglePin(questionDoc._id)}
            className="text-indigo-400 hover:text-indigo-600 transition-colors"
            title={questionDoc.isPinned ? "Unpin" : "Pin"}
          >
            {questionDoc.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>

          <button onClick={() => setIsExpanded((p) => !p)}>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
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
          <span className="text-xs font-bold text-indigo-400 mt-0.5 flex-shrink-0">
            A
          </span>
          {/* Bug fix: was rendering answer as a plain <p> tag, losing all
              formatting (bold, lists, code blocks). Now uses AnswerRenderer
              for consistent formatted output across the whole app. */}
          <div className="flex-1 text-sm text-gray-600">
            <AnswerRenderer answer={questionDoc.answer} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Section block ─────────────────────────────────────────────────────────────
const SectionBlock = ({ section, questions, onTogglePin }) => {
  const color = getSectionColor(section);

  return (
    <div className="mb-8">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-4 ${color.bg}`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color.dot}`} />
        <h3 className="text-base font-semibold text-gray-800">{section}</h3>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${color.badge}`}>
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </span>
      </div>

      {questions.map((q, i) => (
        <QuestionCard
          key={q._id}
          index={i}
          questionDoc={q}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
};

// ── ResumePrep page ───────────────────────────────────────────────────────────
const ResumePrep = () => {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        API_PATHS.SESSION.GET_ONE(sessionId)
      );
      setSession(response.data.session);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to load session. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) fetchSession();
  }, [sessionId, fetchSession]);

  const handleTogglePin = async (questionId) => {
    try {
      await axiosInstance.post(API_PATHS.QUESTION.PIN(questionId));
      fetchSession();
    } catch {
      toast.error("Failed to update pin. Please try again.");
    }
  };

  // Group questions by section, pinned first within each section
  const groupedSections = useMemo(() => {
    if (!session?.questions) return [];

    const map = {};
    session.questions.forEach((q) => {
      const key = q.section || "General";
      if (!map[key]) map[key] = [];
      map[key].push(q);
    });

    return Object.entries(map).map(([section, questions]) => ({
      section,
      questions: [...questions].sort(
        (a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)
      ),
    }));
  }, [session]);

  const totalQuestions = session?.questions?.length ?? 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading session…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 md:px-8 pt-6 pb-12 max-w-3xl">

        {/* Page header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mb-4 transition-colors group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-medium">Back to Dashboard</span>
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FileText size={22} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {session?.role || "Resume Interview Prep"}
              </h1>
              {session?.resumeFileName && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Based on{" "}
                  <span className="font-medium text-gray-700">
                    {session.resumeFileName}
                  </span>
                </p>
              )}
              {session?.updatedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last updated {moment(session.updatedAt).format("Do MMM YYYY")}
                </p>
              )}
            </div>
          </div>

          {session && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                <Sparkles size={12} className="text-blue-500" />
                {groupedSections.length} section{groupedSections.length !== 1 ? "s" : ""} detected
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
                {totalQuestions} questions generated
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
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

        {/* Questions grouped by section */}
        {groupedSections.map(({ section, questions }) => (
          <SectionBlock
            key={section}
            section={section}
            questions={questions}
            onTogglePin={handleTogglePin}
          />
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ResumePrep;