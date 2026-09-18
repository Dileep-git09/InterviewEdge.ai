import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  LuLoader,
  LuSend,
  LuSkipForward,
  LuArrowRight,
  LuFlag,
} from "react-icons/lu";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import CircularTimer from "./components/CircularTimer";
import EvaluationPanel from "./components/EvaluationPanel";
import MockResults from "./components/MockResults";

const MockInterview = () => {
  const { mockId } = useParams();
  const navigate = useNavigate();

  const [mock, setMock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState(null); // current question's eval
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [finished, setFinished] = useState(false);

  // Track how long the candidate spends on each question
  const questionStartRef = useRef(Date.now());

  // ── Load the mock attempt ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // Guard: a malformed URL (e.g. /mock-interview/undefined) must never hit the API
      if (!mockId || mockId === "undefined" || mockId === "null") {
        toast.error("No mock interview selected.");
        navigate("/mock");
        return;
      }
      try {
        const res = await axiosInstance.get(API_PATHS.MOCK.GET_ONE(mockId));
        const m = res.data?.mock;
        if (!m) throw new Error("not found");
        setMock(m);
        if (m.status === "completed") setFinished(true);
        // Resume at first unanswered question
        const firstUnanswered = m.questions.findIndex((q) => !q.answered && !q.skipped);
        setCurrent(firstUnanswered === -1 ? m.questions.length - 1 : firstUnanswered);
      } catch {
        toast.error("Could not load this mock interview.");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mockId, navigate]);

  // Reset the per-question clock whenever we move to a new question
  useEffect(() => {
    questionStartRef.current = Date.now();
    setAnswer("");
    setEvaluation(null);
  }, [current]);

  const total = mock?.questions?.length || 0;
  const isLast = current === total - 1;

  // ── Submit the current answer for evaluation ───────────────────────────────
  const submitAnswer = useCallback(
    async (auto = false, skip = false) => {
      if (submitting || evaluation) return;
      const timeTakenSec = Math.round((Date.now() - questionStartRef.current) / 1000);
      setSubmitting(true);
      try {
        const res = await axiosInstance.post(API_PATHS.MOCK.ANSWER(mockId), {
          questionIndex: current,
          userAnswer: skip ? "" : answer,
          timeTakenSec,
        });
        setEvaluation(res.data?.evaluation || null);
        if (auto && !answer.trim()) {
          toast("Time's up — moving on.", { icon: "⏱️" });
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to evaluate answer.");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, evaluation, answer, current, mockId]
  );

  const handleTimeUp = useCallback(() => {
    if (!evaluation && !submitting) submitAnswer(true);
  }, [evaluation, submitting, submitAnswer]);

  // ── Complete the whole interview ───────────────────────────────────────────
  const completeInterview = async () => {
    setCompleting(true);
    try {
      const res = await axiosInstance.post(API_PATHS.MOCK.COMPLETE(mockId));
      setMock(res.data?.mock);
      setFinished(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("Failed to finish the interview.");
    } finally {
      setCompleting(false);
    }
  };

  const goNext = () => {
    if (isLast) {
      completeInterview();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] text-gray-400">
          <LuLoader size={28} className="animate-spin mb-3" />
          <p>Loading your mock interview…</p>
        </div>
      </DashboardLayout>
    );
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  if (finished && mock) {
    return (
      <DashboardLayout>
        <MockResults
          mock={mock}
          onRetry={() => navigate("/dashboard")}
          onDashboard={() => navigate("/dashboard")}
        />
      </DashboardLayout>
    );
  }

  const q = mock?.questions?.[current];
  const progressPct = total ? ((current + (evaluation ? 1 : 0)) / total) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        {/* ── Sticky header: progress + timer ── */}
        <div className="sticky top-16 z-10 bg-[#fcfbfc]/90 backdrop-blur-sm pt-3 pb-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                {mock.role} · <span className="capitalize">{mock.difficulty}</span>
              </p>
              <h1 className="text-base font-bold text-gray-900">
                Question {current + 1} of {total}
              </h1>
            </div>
            <CircularTimer
              seconds={mock.secondsPerQuestion}
              resetKey={current}
              paused={Boolean(evaluation) || submitting}
              onTimeUp={handleTimeUp}
              size={76}
            />
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-600"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* ── Question card ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
          >
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 mt-2">
              <p className="text-lg font-medium text-gray-900 leading-relaxed">
                {q?.question}
              </p>
            </div>

            {/* Answer area (locked once evaluated) */}
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={Boolean(evaluation) || submitting}
              placeholder="Type your answer as if you were speaking it aloud in the interview…"
              rows={7}
              className="w-full mt-4 px-4 py-3 border border-gray-200 rounded-2xl resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-500 text-gray-800 leading-relaxed"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
              <span>{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>Tip: structure your answer, then add an example.</span>
            </div>

            {/* Action buttons (hidden once evaluated) */}
            {!evaluation && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={() => submitAnswer(false)}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold hover:from-indigo-600 hover:to-blue-700 transition shadow-sm disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <LuLoader size={18} className="animate-spin" /> Evaluating…
                    </>
                  ) : (
                    <>
                      <LuSend size={17} /> Submit answer
                    </>
                  )}
                </button>
                <button
                  onClick={() => submitAnswer(false, true)}
                  disabled={submitting}
                  className="sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition disabled:opacity-60"
                >
                  <LuSkipForward size={17} /> Skip
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Evaluation + Next ── */}
        <AnimatePresence>
          {evaluation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5"
            >
              <EvaluationPanel evaluation={evaluation} />

              <button
                onClick={goNext}
                disabled={completing}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition disabled:opacity-60"
              >
                {completing ? (
                  <>
                    <LuLoader size={18} className="animate-spin" /> Building your debrief…
                  </>
                ) : isLast ? (
                  <>
                    <LuFlag size={17} /> Finish & see results
                  </>
                ) : (
                  <>
                    Next question <LuArrowRight size={17} />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default MockInterview;