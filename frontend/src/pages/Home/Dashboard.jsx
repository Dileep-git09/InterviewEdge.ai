import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuPlus, LuTarget, LuArrowRight, LuTrash2, LuBookOpen,
  LuFileText, LuTrophy, LuFlame, LuLayers, LuClipboardList,
} from "react-icons/lu";
import moment from "moment";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import { CARD_BG } from "../../utils/data";
import { PREP_TOPICS } from "../../utils/prepKitData";
import SummaryCard from "../../components/Cards/SummaryCard";
import CreateSessionForm from "./CreateSessionForm";
import MockSetupForm from "../MockInterview/MockSetupForm";
import Modal from "../../components/Modal";
import { UserContext } from "../../context/userContext";
import Button from "../../components/ui/Button";
import { Card, StatCard, SectionHeading, ProgressBar } from "../../components/ui/primitives";
import Badge from "../../components/ui/Badge";

// Compute a simple "current streak" of consecutive days with activity
const computeStreak = (dates) => {
  const days = new Set(
    dates.filter(Boolean).map((d) => moment(d).format("YYYY-MM-DD"))
  );
  if (days.size === 0) return 0;
  let streak = 0;
  let cursor = moment();
  // allow today OR yesterday to start the streak
  if (!days.has(cursor.format("YYYY-MM-DD"))) cursor = cursor.subtract(1, "day");
  while (days.has(cursor.format("YYYY-MM-DD"))) {
    streak += 1;
    cursor = cursor.subtract(1, "day");
  }
  return streak;
};

const scoreColor = (s) =>
  s >= 80 ? "text-emerald-600 border-emerald-500"
    : s >= 60 ? "text-amber-600 border-amber-500"
    : "text-rose-600 border-rose-500";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const [sessions, setSessions] = useState([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsHasMore, setSessionsHasMore] = useState(false);
  const [loadingMoreSessions, setLoadingMoreSessions] = useState(false);
  const [mocks, setMocks] = useState([]);
  const [mocksTotal, setMocksTotal] = useState(0);
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openMockModal, setOpenMockModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState({ open: false, data: null });

  const SESSIONS_PAGE_SIZE = 12;

  // Replaces the session list — used for the initial load and after a delete.
  const fetchAllSessions = async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SESSION.GET_ALL(1, SESSIONS_PAGE_SIZE));
      setSessions(res.data?.sessions || []);
      setSessionsTotal(res.data?.total ?? 0);
      setSessionsPage(1);
      setSessionsHasMore((res.data?.totalPages ?? 1) > 1);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to fetch sessions.");
    }
  };

  // Appends the next page — used by the "Load more" button.
  const loadMoreSessions = async () => {
    const nextPage = sessionsPage + 1;
    setLoadingMoreSessions(true);
    try {
      const res = await axiosInstance.get(API_PATHS.SESSION.GET_ALL(nextPage, SESSIONS_PAGE_SIZE));
      setSessions((prev) => [...prev, ...(res.data?.sessions || [])]);
      setSessionsPage(nextPage);
      setSessionsHasMore(nextPage < (res.data?.totalPages ?? 1));
    } catch (error) {
      console.error("Error loading more sessions:", error);
      toast.error("Failed to load more sessions.");
    } finally {
      setLoadingMoreSessions(false);
    }
  };

  const fetchMocks = async () => {
    try {
      // Only the 5 most recent are ever shown here — this page doesn't need
      // the full history, just enough to fill that list.
      const res = await axiosInstance.get(API_PATHS.MOCK.MY(1, 10));
      setMocks(res.data?.mocks || []);
      setMocksTotal(res.data?.total ?? 0);
    } catch (error) {
      // Non-fatal: mock history just won't show
      console.error("Error fetching mock history:", error);
    }
  };

  useEffect(() => {
    fetchAllSessions();
    fetchMocks();
  }, []);

  const stats = useMemo(() => {
    // totalQuestions/streak are only computed over the currently-loaded page
    // of sessions (a reasonable approximation — the alternative is summing
    // across every page on every load, which defeats the point of paginating).
    const totalQuestions = sessions.reduce((a, s) => a + (s.questions?.length || 0), 0);
    const completed = mocks.filter((m) => m.status === "completed" && typeof m.overallScore === "number");
    const avg = completed.length
      ? Math.round(completed.reduce((a, m) => a + m.overallScore, 0) / completed.length)
      : null;
    const streak = computeStreak([
      ...mocks.map((m) => m.completedAt || m.createdAt),
      ...sessions.map((s) => s.updatedAt),
    ]);
    return { totalQuestions, avg, attempts: mocksTotal, streak };
  }, [sessions, mocks, mocksTotal]);

  const handleConfirmDelete = async () => {
    if (!openDeleteAlert.data) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(API_PATHS.SESSION.DELETE(openDeleteAlert.data._id));
      toast.success("Session deleted successfully!");
      setOpenDeleteAlert({ open: false, data: null });
      fetchAllSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectSession = (s) =>
    navigate(s.source === "resume" ? `/resume-prep/${s._id}` : `/interview-prep/${s._id}`);

  const firstName = user?.name?.split(" ")[0] || "there";

  const QUICK = [
    { icon: LuPlus, title: "New AI Session", desc: "Generate custom questions", tone: "indigo", onClick: () => setOpenCreateModal(true) },
    { icon: LuTarget, title: "Mock Interview", desc: "Timed, AI-scored practice", tone: "violet", onClick: () => setOpenMockModal(true) },
    { icon: LuBookOpen, title: "Prep Kit", desc: "Topic-based challenges", tone: "emerald", onClick: () => navigate("/prep-kit") },
    { icon: LuTrophy, title: "Analytics", desc: "Track your progress", tone: "amber", onClick: () => navigate("/analytics") },
  ];

  return (
    <DashboardLayout title="Dashboard" subtitle="Your interview prep at a glance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Greeting */}
        <div className="animate-fade-up">
          <h2 className="text-2xl font-extrabold text-slate-900">
            Welcome back, {firstName} 👋
          </h2>
          <p className="text-slate-500 mt-1">Pick up where you left off, or start something new.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<LuClipboardList size={22} />} tone="indigo" value={sessionsTotal} label="Sessions" />
          <StatCard icon={<LuLayers size={22} />} tone="violet" value={stats.totalQuestions} label="Questions" />
          <StatCard icon={<LuTarget size={22} />} tone="emerald" value={stats.attempts} label="Mock attempts" />
          <StatCard icon={<LuFlame size={22} />} tone="amber" value={`${stats.streak}d`} label="Current streak"
            sublabel={stats.avg != null ? `Avg mock score ${stats.avg}` : "No mocks yet"} />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK.map((q) => (
            <button key={q.title} onClick={q.onClick}
              className="text-left bg-white rounded-2xl border border-slate-100 shadow-soft p-5 hover:-translate-y-1 hover:shadow-glow hover:border-indigo-200 transition-all group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${
                q.tone === "indigo" ? "bg-indigo-50 text-indigo-600"
                : q.tone === "violet" ? "bg-violet-50 text-violet-600"
                : q.tone === "emerald" ? "bg-emerald-50 text-emerald-600"
                : "bg-amber-50 text-amber-600"}`}>
                <q.icon size={20} />
              </div>
              <p className="font-bold text-slate-900 flex items-center gap-1">
                {q.title}
                <LuArrowRight size={14} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{q.desc}</p>
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeading title="Your sessions" />
              <Button variant="secondary" size="sm" onClick={() => setOpenCreateModal(true)}>
                <LuPlus size={15} /> New
              </Button>
            </div>

            {sessions.length === 0 ? (
              <Card className="p-10 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LuClipboardList size={26} />
                </div>
                <p className="mt-4 font-bold text-slate-900">No sessions yet</p>
                <p className="text-sm text-slate-500 mt-1">Generate your first set of AI questions to get started.</p>
                <Button className="mt-5 mx-auto" onClick={() => setOpenCreateModal(true)}>
                  <LuPlus size={16} /> Create a session
                </Button>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sessions.map((data, index) => (
                    <SummaryCard
                      key={data?._id}
                      colors={CARD_BG[index % CARD_BG.length]}
                      role={data?.role || ""}
                      topicsToFocus={data?.topicsToFocus || ""}
                      experience={data?.experience || "-"}
                      questions={data?.questions?.length || "-"}
                      description={data?.description || ""}
                      lastUpdated={data?.updatedAt ? moment(data.updatedAt).format("DD MMM YYYY") : ""}
                      source={data?.source}
                      resumeFileName={data?.resumeFileName}
                      onSelect={() => handleSelectSession(data)}
                      onDelete={() => setOpenDeleteAlert({ open: true, data })}
                    />
                  ))}
                </div>
                {sessionsHasMore && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mx-auto"
                    disabled={loadingMoreSessions}
                    onClick={loadMoreSessions}
                  >
                    {loadingMoreSessions ? "Loading…" : `Load more (${sessions.length} of ${sessionsTotal})`}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Side column: recent mocks + prep kit */}
          <div className="space-y-6">
            {/* Recent mocks */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-slate-900">Recent mocks</p>
                <button onClick={() => navigate("/mock")} className="text-xs font-semibold text-indigo-600 hover:underline">View all</button>
              </div>
              {mocks.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-400">No attempts yet.</p>
                  <Button size="sm" className="mt-3 mx-auto" onClick={() => setOpenMockModal(true)}>
                    <LuTarget size={14} /> Start a mock
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {mocks.slice(0, 5).map((m) => (
                    <li key={m._id}>
                      <button onClick={() => navigate(`/mock-interview/${m._id}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition text-left">
                        <span className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold bg-white ${scoreColor(m.overallScore ?? 0)}`}>
                          {m.status === "completed" ? (m.overallScore ?? 0) : "–"}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-800 truncate">{m.role}</span>
                          <span className="block text-xs text-slate-400">{moment(m.createdAt).fromNow()} · {m.difficulty}</span>
                        </span>
                        {m.status !== "completed" && <Badge tone="amber">In progress</Badge>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Prep kit teaser */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-slate-900">Continue in Prep Kit</p>
                <button onClick={() => navigate("/prep-kit")} className="text-xs font-semibold text-indigo-600 hover:underline">Browse</button>
              </div>
              <div className="space-y-3">
                {PREP_TOPICS.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => navigate("/prep-kit")} className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{t.title}</span>
                      <Badge difficulty={t.difficulty} />
                    </div>
                    <div className="mt-1.5"><ProgressBar value={t.companyPct} showLabel={false} size="sm" /></div>
                    <p className="text-[11px] text-slate-400 mt-1">{t.companyPct}% of companies test this</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={openCreateModal} onClose={() => setOpenCreateModal(false)} hideHeader>
        <div><CreateSessionForm onClose={() => setOpenCreateModal(false)} /></div>
      </Modal>

      <Modal isOpen={openMockModal} onClose={() => setOpenMockModal(false)} hideHeader>
        <div><MockSetupForm onClose={() => setOpenMockModal(false)} /></div>
      </Modal>

      <Modal isOpen={openDeleteAlert.open} onClose={() => setOpenDeleteAlert({ open: false, data: null })} title="Delete Session">
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100 text-red-500">
            <LuTrash2 size={26} />
          </div>
          <div>
            <p className="text-gray-800 font-medium text-base">
              Delete &quot;{openDeleteAlert.data?.role}&quot; session?
            </p>
            <p className="text-gray-500 text-sm mt-1">
              This permanently removes the session and its{" "}
              <span className="font-medium text-gray-700">
                {openDeleteAlert.data?.questions?.length || 0} question
                {openDeleteAlert.data?.questions?.length !== 1 ? "s" : ""}
              </span>. This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 w-full mt-1">
            <button onClick={() => setOpenDeleteAlert({ open: false, data: null })} disabled={isDeleting}
              className="flex-1 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleConfirmDelete} disabled={isDeleting}
              className="flex-1 py-2 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50">
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Dashboard;
