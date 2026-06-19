import React from "react";

const TONES = {
  brand:   "bg-indigo-50 text-indigo-700 border-indigo-100",
  violet:  "bg-violet-50 text-violet-700 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber:   "bg-amber-50 text-amber-700 border-amber-100",
  rose:    "bg-rose-50 text-rose-700 border-rose-100",
  slate:   "bg-slate-100 text-slate-600 border-slate-200",
};

// Maps a difficulty string to a tone
const DIFFICULTY_TONE = { easy: "emerald", medium: "amber", hard: "rose" };

const Badge = ({ children, tone, difficulty, icon, className = "" }) => {
  const resolved = difficulty ? DIFFICULTY_TONE[difficulty] || "slate" : tone || "slate";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${TONES[resolved]} ${className}`}
    >
      {icon}
      {difficulty ? difficulty[0].toUpperCase() + difficulty.slice(1) : children}
    </span>
  );
};

export default Badge;
