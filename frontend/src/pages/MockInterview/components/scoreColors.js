// Pure helpers shared by ScoreRing, EvaluationPanel, and MockResults.
// Kept in their own module so the component files only export components
// (satisfies the react-refresh/only-export-components lint rule).

export const bandColor = (s) =>
  s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : s >= 40 ? "#f97316" : "#ef4444";

export const bandLabel = (s) =>
  s >= 80 ? "Strong" : s >= 60 ? "Solid" : s >= 40 ? "Developing" : "Needs work";
