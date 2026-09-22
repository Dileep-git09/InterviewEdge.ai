import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuTrophy, LuTarget, LuTrendingUp, LuPercent, LuLoader, LuChartLine,
} from "react-icons/lu";
import moment from "moment";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import { Card, StatCard, SectionHeading } from "../../components/ui/primitives";
import Button from "../../components/ui/Button";
import LeaderboardPanel from "../../components/Cards/LeaderboardPanel";

// ── Lightweight SVG area/line chart ──────────────────────────────────────────
const LineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const W = 600, H = 220, P = 28;
  const max = 100, min = 0;
  const stepX = data.length > 1 ? (W - P * 2) / (data.length - 1) : 0;
  const xy = data.map((d, i) => {
    const x = P + i * stepX;
    const y = H - P - ((d.value - min) / (max - min)) * (H - P * 2);
    return [x, y];
  });
  const line = xy.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${xy[xy.length - 1][0]},${H - P} L${xy[0][0]},${H - P} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ aspectRatio: `${W} / ${H}` }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0, 25, 50, 75, 100].map((g) => {
        const y = H - P - (g / 100) * (H - P * 2);
        return (
          <g key={g}>
            <line x1={P} y1={y} x2={W - P} y2={y} stroke="#eef2f7" strokeWidth="1" />
            <text x={8} y={y + 3} fontSize="9" fill="#94a3b8">{g}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#areaGrad)" />
      <path d={line} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xy.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#fff" stroke="#6366f1" strokeWidth="2" />
          {data.length <= 12 && (
            <text x={x} y={H - P + 14} fontSize="8.5" fill="#94a3b8" textAnchor="middle">{data[i].label}</text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ── Lightweight SVG bar chart ─────────────────────────────────────────────────
const BarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-around gap-4 h-48 px-2">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <span className="text-sm font-bold text-slate-700">{d.value}</span>
          <div
            className="w-full max-w-[56px] rounded-t-lg transition-all duration-700"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: 4, background: d.color }}
          />
          <span className="text-xs text-slate-500 capitalize">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const Analytics = () => {
  const navigate = useNavigate();
  const [mocks, setMocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardRole, setLeaderboardRole] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Analytics needs as much history as possible to be meaningful — 100
        // is the API's max page size, not a true "everything" guarantee.
        const res = await axiosInstance.get(API_PATHS.MOCK.MY(1, 100));
        setMocks(res.data?.mocks || []);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { scoreSeries, byDifficulty, avg, best, completionRate, roles } = useMemo(() => {
    const completed = mocks
      .filter((m) => m.status === "completed" && typeof m.overallScore === "number")
      .sort((a, b) => new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt));

    // Most-recently-attempted role first, de-duplicated (mocks is already
    // newest-first from the API, so the first occurrence of each role here
    // is the newest one) — used to default and populate the role picker.
    const roles = [...new Map(
      mocks.map((m) => [m.role.toLowerCase().trim(), m.role])
    ).values()];

    const scoreSeries = completed.slice(-12).map((m) => ({
      label: moment(m.completedAt || m.createdAt).format("DD/MM"),
      value: m.overallScore,
    }));

    const diffColors = { easy: "#10b981", medium: "#f59e0b", hard: "#ef4444" };
    const counts = { easy: 0, medium: 0, hard: 0 };
    mocks.forEach((m) => { if (counts[m.difficulty] != null) counts[m.difficulty] += 1; });
    const byDifficulty = Object.keys(counts).map((k) => ({ label: k, value: counts[k], color: diffColors[k] }));

    const avg = completed.length ? Math.round(completed.reduce((a, m) => a + m.overallScore, 0) / completed.length) : null;
    const best = completed.length ? Math.max(...completed.map((m) => m.overallScore)) : null;
    const completionRate = mocks.length ? Math.round((completed.length / mocks.length) * 100) : 0;

    return { completed, scoreSeries, byDifficulty, avg, best, completionRate, roles };
  }, [mocks]);

  // Default the leaderboard's role picker to the most recently attempted role.
  useEffect(() => {
    if (roles.length > 0 && !leaderboardRole) setLeaderboardRole(roles[0]);
  }, [roles, leaderboardRole]);

  if (loading) {
    return (
      <DashboardLayout title="Analytics">
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
          <LuLoader size={26} className="animate-spin mb-3" /> Loading your stats…
        </div>
      </DashboardLayout>
    );
  }

  const empty = mocks.length === 0;

  return (
    <DashboardLayout title="Analytics" subtitle="Track your progress over time">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {empty ? (
          <Card className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LuChartLine size={26} />
            </div>
            <p className="mt-4 font-bold text-slate-900">No data yet</p>
            <p className="text-sm text-slate-500 mt-1">Complete a mock interview and your analytics will appear here.</p>
            <Button className="mt-5 mx-auto" onClick={() => navigate("/mock")}>
              <LuTarget size={16} /> Start your first mock
            </Button>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<LuTarget size={22} />} tone="indigo" value={mocks.length} label="Total attempts" />
              <StatCard icon={<LuTrendingUp size={22} />} tone="violet" value={avg != null ? avg : "–"} label="Average score" />
              <StatCard icon={<LuTrophy size={22} />} tone="emerald" value={best != null ? best : "–"} label="Best score" />
              <StatCard icon={<LuPercent size={22} />} tone="amber" value={`${completionRate}%`} label="Completion rate" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6">
                <SectionHeading title="Score over time" subtitle="Your last 12 completed mocks" />
                <div className="mt-4">
                  {scoreSeries.length > 0
                    ? <LineChart data={scoreSeries} />
                    : <p className="text-sm text-slate-400 py-10 text-center">Complete a mock to see your trend.</p>}
                </div>
              </Card>

              <Card className="p-6">
                <SectionHeading title="Attempts by difficulty" />
                <div className="mt-6"><BarChart data={byDifficulty} /></div>
              </Card>
            </div>

            {/* Leaderboard */}
            {roles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionHeading title="How you compare" subtitle="Best score per person, for the role you pick" />
                  <select
                    value={leaderboardRole}
                    onChange={(e) => setLeaderboardRole(e.target.value)}
                    className="text-sm font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <LeaderboardPanel role={leaderboardRole} limit={10} />
              </div>
            )}

            {/* Recent table */}
            <Card className="p-6">
              <SectionHeading title="Recent attempts" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="py-2 font-medium">Role</th>
                      <th className="py-2 font-medium">Difficulty</th>
                      <th className="py-2 font-medium">Score</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mocks.slice(0, 10).map((m) => (
                      <tr key={m._id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                        <td className="py-3 font-medium text-slate-800">{m.role}</td>
                        <td className="py-3 capitalize text-slate-500">{m.difficulty}</td>
                        <td className="py-3 font-bold text-slate-900">
                          {m.status === "completed" ? m.overallScore : "–"}
                        </td>
                        <td className="py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            m.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {m.status === "completed" ? "Completed" : "In progress"}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{moment(m.createdAt).format("DD MMM")}</td>
                        <td className="py-3 text-right">
                          <button onClick={() => navigate(`/mock-interview/${m._id}`)}
                            className="text-xs font-semibold text-indigo-600 hover:underline">
                            {m.status === "completed" ? "Review" : "Resume"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
