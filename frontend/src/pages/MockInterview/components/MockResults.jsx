import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LuTrophy,
  LuClock,
  LuChevronDown,
  LuRotateCcw,
  LuLayoutDashboard,
  LuSparkles,
  LuTarget,
} from "react-icons/lu";
import ScoreRing from "./ScoreRing";
import { bandColor } from "./scoreColors";
import EvaluationPanel from "./EvaluationPanel";
import LeaderboardPanel from "../../../components/Cards/LeaderboardPanel";

const formatTime = (sec = 0) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ── Per-question accordion row ───────────────────────────────────────────────
const ResultRow = ({ q, index }) => {
  const [open, setOpen] = useState(false);
  const score = q.score ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: `${bandColor(score)}1a`, color: bandColor(score) }}
        >
          {score}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-800 line-clamp-2">
          <span className="text-gray-400 mr-1">Q{index + 1}.</span>
          {q.question}
        </span>
        <LuChevronDown
          size={18}
          className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-4"
        >
          {/* Candidate's own answer */}
          <div className="mb-3 mt-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Your answer
            </p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">
              {q.userAnswer?.trim() ? q.userAnswer : <em className="text-gray-400">No answer provided.</em>}
            </p>
          </div>
          <EvaluationPanel evaluation={q} />
        </motion.div>
      )}
    </div>
  );
};

// ── MockResults ──────────────────────────────────────────────────────────────
const MockResults = ({ mock, onRetry, onDashboard }) => {
  const overall = mock?.overallScore ?? 0;
  const answered = (mock?.questions || []).filter((q) => q.answered).length;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 120, damping: 16 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-md p-6 md:p-8 mt-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreRing score={overall} size={150} stroke={11} />

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm mb-1">
              <LuTrophy size={16} />
              Mock interview complete
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {mock.role}
            </h1>
            <p className="text-gray-500 mt-1">
              {mock.overallVerdict || "Here's your full debrief."}
            </p>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-4">
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700 capitalize">
                {mock.difficulty}
              </span>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                {answered}/{mock.questions?.length} answered
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                <LuClock size={12} /> {formatTime(mock.totalTimeSec)}
              </span>
            </div>
          </div>
        </div>

        {/* AI summary */}
        {mock.summary && (
          <p className="mt-6 text-gray-700 leading-relaxed bg-indigo-50/50 border border-indigo-100 rounded-2xl px-5 py-4">
            {mock.summary}
          </p>
        )}

        {/* Strengths / focus areas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {mock.topStrengths?.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-emerald-700 mb-2">
                <LuSparkles size={15} /> Top strengths
              </div>
              <ul className="space-y-1">
                {mock.topStrengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-emerald-400">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {mock.focusAreas?.length > 0 && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-amber-700 mb-2">
                <LuTarget size={15} /> Focus areas
              </div>
              <ul className="space-y-1">
                {mock.focusAreas.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-amber-400">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={onRetry}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold hover:from-indigo-600 hover:to-blue-700 transition shadow-sm"
          >
            <LuRotateCcw size={17} /> New mock interview
          </button>
          <button
            onClick={onDashboard}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            <LuLayoutDashboard size={17} /> Back to dashboard
          </button>
        </div>
      </motion.div>

      {/* How you compare */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 px-1">
          How you compare
        </h2>
        <LeaderboardPanel role={mock.role} limit={5} compact />
      </div>

      {/* Per-question breakdown */}
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3 px-1">
        Question-by-question breakdown
      </h2>
      <div className="space-y-3">
        {(mock.questions || []).map((q, i) => (
          <ResultRow key={q._id || i} q={q} index={i} />
        ))}
      </div>
    </div>
  );
};

export default MockResults;