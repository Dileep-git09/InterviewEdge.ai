import React, { useEffect, useState } from "react";

// ── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ className = "", hover = false, children, ...props }) => (
  <div
    className={`bg-white rounded-2xl border border-slate-100 shadow-soft ${
      hover ? "transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:border-indigo-200" : ""
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

// ── ProgressBar (animated) ───────────────────────────────────────────────────
export const ProgressBar = ({ value = 0, showLabel = true, size = "md", tone }) => {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(Math.min(Math.max(value, 0), 100)), 120);
    return () => clearTimeout(t);
  }, [value]);

  const h = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const color =
    tone ||
    (value >= 75 ? "from-emerald-400 to-emerald-600"
      : value >= 40 ? "from-indigo-400 to-violet-500"
      : "from-amber-400 to-orange-500");

  return (
    <div className="w-full">
      <div className={`w-full ${h} bg-slate-100 rounded-full overflow-hidden`}>
        <div
          className={`${h} rounded-full bg-gradient-to-r ${color} transition-[width] duration-1000 ease-out`}
          style={{ width: `${w}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-[11px] text-slate-400 font-medium">
          <span>Progress</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
    </div>
  );
};

// ── StatCard ─────────────────────────────────────────────────────────────────
export const StatCard = ({ icon, label, value, sublabel, tone = "indigo" }) => {
  const toneMap = {
    indigo:  "bg-indigo-50 text-indigo-600",
    violet:  "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    rose:    "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="p-5 flex items-center gap-4" hover>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${toneMap[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
        <p className="text-sm text-slate-500 mt-1 truncate">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sublabel}</p>}
      </div>
    </Card>
  );
};

// ── SectionHeading ───────────────────────────────────────────────────────────
export const SectionHeading = ({ eyebrow, title, subtitle, center, className = "" }) => (
  <div className={`${center ? "text-center mx-auto" : ""} max-w-2xl ${className}`}>
    {eyebrow && (
      <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">
        {eyebrow}
      </span>
    )}
    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
    {subtitle && <p className="text-slate-500 mt-2 leading-relaxed">{subtitle}</p>}
  </div>
);

// ── Container ────────────────────────────────────────────────────────────────
export const Container = ({ className = "", children }) => (
  <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);
