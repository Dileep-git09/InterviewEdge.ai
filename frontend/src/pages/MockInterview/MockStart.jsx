import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuTarget, LuClock, LuArrowRight } from "react-icons/lu";
import moment from "moment";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import MockSetupForm from "./MockSetupForm";
import { Card, SectionHeading } from "../../components/ui/primitives";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const scoreColor = (s) =>
  s >= 80 ? "text-emerald-600 border-emerald-500"
    : s >= 60 ? "text-amber-600 border-amber-500"
    : "text-rose-600 border-rose-500";

const PAGE_SIZE = 10;

const MockStart = () => {
  const navigate = useNavigate();
  const [mocks, setMocks] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.MOCK.MY(1, PAGE_SIZE));
        setMocks(res.data?.mocks || []);
        setTotal(res.data?.total ?? 0);
        setHasMore((res.data?.totalPages ?? 1) > 1);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await axiosInstance.get(API_PATHS.MOCK.MY(nextPage, PAGE_SIZE));
      setMocks((prev) => [...prev, ...(res.data?.mocks || [])]);
      setPage(nextPage);
      setHasMore(nextPage < (res.data?.totalPages ?? 1));
    } catch {
      /* non-fatal */
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <DashboardLayout title="Mock Interview" subtitle="Timed, AI-scored practice">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Setup */}
        <div>
          <MockSetupForm onClose={() => {}} />
        </div>

        {/* Recent attempts */}
        <Card className="p-6">
          <SectionHeading title="Your attempts" subtitle="Resume an unfinished mock or review a past one" />
          {mocks.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <LuTarget size={28} className="mx-auto mb-2 text-slate-300" />
              No attempts yet — start one on the left.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {mocks.map((m) => (
                <li key={m._id}>
                  <button
                    onClick={() => navigate(`/mock-interview/${m._id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition text-left"
                  >
                    <span className={`w-11 h-11 rounded-full border-2 flex items-center justify-center text-sm font-bold bg-white ${scoreColor(m.overallScore ?? 0)}`}>
                      {m.status === "completed" ? (m.overallScore ?? 0) : "–"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-800 truncate">{m.role}</span>
                      <span className="flex items-center gap-2 text-xs text-slate-400">
                        <LuClock size={12} /> {moment(m.createdAt).fromNow()}
                        <span className="capitalize">· {m.difficulty}</span>
                      </span>
                    </span>
                    {m.status !== "completed"
                      ? <Badge tone="amber">Resume</Badge>
                      : <LuArrowRight size={16} className="text-slate-300" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {hasMore && (
            <Button
              variant="secondary"
              size="sm"
              className="mx-auto mt-4"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? "Loading…" : `Load more (${mocks.length} of ${total})`}
            </Button>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MockStart;
