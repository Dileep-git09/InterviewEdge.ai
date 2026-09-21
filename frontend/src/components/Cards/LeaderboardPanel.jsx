import React, { useEffect, useState } from "react";
import { LuTrophy, LuLoader, LuUsers } from "react-icons/lu";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import { Card, SectionHeading } from "../ui/primitives";

const RANK_TONE = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-slate-200 text-slate-600",
  3: "bg-orange-100 text-orange-700",
};

const RankBadge = ({ rank }) => (
  <span
    className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
      RANK_TONE[rank] || "bg-indigo-50 text-indigo-600"
    }`}
  >
    {rank}
  </span>
);

// ── LeaderboardPanel ──────────────────────────────────────────────────────────
// Reused on Analytics (persistent view, role picker) and MockResults (a
// one-off "how did you do vs. others" callout right after finishing a mock).
// Fails silently — this is a nice-to-have, never worth blocking the page it's
// embedded in over.
const LeaderboardPanel = ({ role, limit = 10, compact = false }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    setFailed(false);
    axiosInstance
      .get(API_PATHS.LEADERBOARD.GET(role, limit))
      .then((res) => setData(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [role, limit]);

  if (!role || failed) return null;

  if (loading) {
    return (
      <Card className={compact ? "p-5" : "p-6"}>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <LuLoader size={20} className="animate-spin" />
        </div>
      </Card>
    );
  }

  const { leaderboard = [], you, total = 0 } = data || {};

  if (total === 0) {
    return (
      <Card className={compact ? "p-5" : "p-6"}>
        {!compact && <SectionHeading title="Leaderboard" subtitle={role} />}
        <p className="text-sm text-slate-400 text-center py-6">
          No completed mocks for this role yet — be the first!
        </p>
      </Card>
    );
  }

  return (
    <Card className={compact ? "p-5" : "p-6"}>
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <SectionHeading title="Leaderboard" subtitle={role} />
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <LuUsers size={13} /> {total} {total === 1 ? "participant" : "participants"}
          </span>
        </div>
      )}

      <ul className={compact ? "mt-2 space-y-1.5" : "mt-4 space-y-1.5"}>
        {leaderboard.map((entry) => (
          <li
            key={entry.rank}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
              entry.isYou ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50"
            }`}
          >
            <RankBadge rank={entry.rank} />
            <span className={`flex-1 text-sm truncate ${entry.isYou ? "font-bold text-indigo-700" : "text-slate-700"}`}>
              {entry.name}
              {entry.isYou && <span className="ml-1.5 text-xs font-medium text-indigo-500">(you)</span>}
            </span>
            <span className="text-sm font-bold text-slate-900">{entry.score}</span>
          </li>
        ))}
      </ul>

      {you && !leaderboard.some((e) => e.isYou) && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 px-3">
          <span className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <LuTrophy size={15} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">
              You're #{you.rank} of {you.totalParticipants}
            </p>
            <p className="text-xs text-slate-400">
              {you.totalParticipants > 1
                ? `Better than ${you.percentile}% of attempts for this role`
                : "First attempt recorded for this role"}
            </p>
          </div>
          <span className="text-sm font-bold text-slate-900">{you.score}</span>
        </div>
      )}
    </Card>
  );
};

export default LeaderboardPanel;
