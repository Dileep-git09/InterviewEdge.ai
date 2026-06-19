import React, { useEffect, useState } from "react";
import { bandColor, bandLabel } from "./scoreColors";

// ── ScoreRing ────────────────────────────────────────────────────────────────
// Animated circular score gauge (0–100). The arc animates from 0 to `score`
// on mount, and the colour reflects the band (red / amber / green).
const ScoreRing = ({ score = 0, size = 120, stroke = 9, showLabel = true }) => {
  const [display, setDisplay] = useState(0);

  // Animate the number + arc up to the real score
  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - display / 100);
  const color = bandColor(score);

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eef0f4"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-extrabold text-gray-900 tabular-nums"
          style={{ fontSize: size * 0.28 }}
        >
          {display}
        </span>
        {showLabel && (
          <span
            className="font-semibold uppercase tracking-wide"
            style={{ fontSize: size * 0.1, color }}
          >
            {bandLabel(score)}
          </span>
        )}
      </div>
    </div>
  );
};

export default ScoreRing;