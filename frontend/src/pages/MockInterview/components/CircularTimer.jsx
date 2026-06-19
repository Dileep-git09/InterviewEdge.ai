import React, { useEffect, useRef, useState } from "react";

// ── CircularTimer ────────────────────────────────────────────────────────────
// A responsive SVG ring that counts down `seconds`. Calls onTimeUp() once when
// it hits zero. Pauses when `paused` is true. Resets whenever `resetKey` changes
// (pass the question index so each new question restarts the clock).
const CircularTimer = ({
  seconds = 120,
  resetKey = 0,
  paused = false,
  onTimeUp = () => {},
  size = 88,
  stroke = 7,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  // Reset on new question
  useEffect(() => {
    setRemaining(seconds);
    firedRef.current = false;
  }, [resetKey, seconds]);

  // Tick
  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      if (!firedRef.current) {
        firedRef.current = true;
        onTimeUpRef.current();
      }
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused]);

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(remaining / seconds, 0);
  const offset = circumference * (1 - pct);

  // Colour shifts from indigo → amber → red as time runs low
  const color =
    pct > 0.5 ? "#4f46e5" : pct > 0.2 ? "#f59e0b" : "#ef4444";

  const mm = String(Math.floor(remaining / 60)).padStart(1, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Time remaining ${mm}:${ss}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
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
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`font-bold tabular-nums ${
            remaining <= 10 ? "text-red-500" : "text-gray-800"
          }`}
          style={{ fontSize: size * 0.22 }}
        >
          {mm}:{ss}
        </span>
      </div>
    </div>
  );
};

export default CircularTimer;