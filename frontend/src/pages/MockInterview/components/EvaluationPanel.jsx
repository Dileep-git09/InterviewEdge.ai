import React from "react";
import { motion } from "framer-motion";
import {
  LuCircleCheck,
  LuCircleArrowUp,
  LuTarget,
  LuLightbulb,
} from "react-icons/lu";
import ScoreRing from "./ScoreRing";
import { bandColor } from "./scoreColors";
import AnswerRenderer from "../../../components/AnswerRenderer";

// ── A labelled bullet list block (strengths / improvements / missed) ─────────
const FeedbackList = ({ icon, title, items, tone }) => {
  if (!items || items.length === 0) return null;
  const toneMap = {
    green:  "text-emerald-600 bg-emerald-50 border-emerald-100",
    amber:  "text-amber-600 bg-amber-50 border-amber-100",
    rose:   "text-rose-600 bg-rose-50 border-rose-100",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneMap[tone]}`}>
      <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-gray-700 flex gap-2 leading-relaxed">
            <span className="text-gray-400 mt-0.5">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── EvaluationPanel ──────────────────────────────────────────────────────────
const EvaluationPanel = ({ evaluation }) => {
  if (!evaluation) return null;

  const {
    score = 0,
    verdict,
    strengths = [],
    improvements = [],
    missedPoints = [],
    modelAnswer = "",
    skipped,
  } = evaluation;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6"
    >
      {/* Header: score + verdict */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <ScoreRing score={score} size={110} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: `${bandColor(score)}1a`, color: bandColor(score) }}
            >
              {skipped ? "Skipped" : "Evaluated"}
            </span>
          </div>
          <p className="text-gray-800 font-medium leading-relaxed">
            {verdict || "Here's how your answer measured up."}
          </p>
        </div>
      </div>

      {/* Feedback grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        <FeedbackList
          tone="green"
          title="What you did well"
          icon={<LuCircleCheck size={16} />}
          items={strengths}
        />
        <FeedbackList
          tone="amber"
          title="How to improve"
          icon={<LuCircleArrowUp size={16} />}
          items={improvements}
        />
        <FeedbackList
          tone="rose"
          title="Points you missed"
          icon={<LuTarget size={16} />}
          items={missedPoints}
        />
      </div>

      {/* Model answer */}
      {modelAnswer && (
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2 font-semibold text-sm text-indigo-700">
            <LuLightbulb size={16} />
            Model answer
          </div>
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-gray-700">
            <AnswerRenderer answer={modelAnswer} />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default EvaluationPanel;