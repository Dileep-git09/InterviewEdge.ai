import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlay, LuLoader, LuX } from "react-icons/lu";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";

const DIFFICULTIES = [
  { value: "easy",   label: "Easy",   active: "bg-green-100 text-green-800 border-green-400" },
  { value: "medium", label: "Medium", active: "bg-yellow-100 text-yellow-800 border-yellow-400" },
  { value: "hard",   label: "Hard",   active: "bg-red-100 text-red-800 border-red-400" },
];

const QUESTION_COUNTS = [3, 5, 7, 10];
const TIMER_OPTIONS = [
  { value: 60,  label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
  { value: 300, label: "5 min" },
];

// ── MockSetupForm ────────────────────────────────────────────────────────────
// Pass a `session` object to start a mock FROM an existing session (locks role
// fields and pulls its questions). Omit it for a fresh AI-generated mock.
const MockSetupForm = ({ onClose, session = null }) => {
  const navigate = useNavigate();
  const fromSession = Boolean(session);

  const [form, setForm] = useState({
    role:          session?.role || "",
    experience:    session?.experience || "",
    topicsToFocus: session?.topicsToFocus || "",
  });
  const [difficulty, setDifficulty] = useState(session?.difficulty || "medium");
  const [count, setCount] = useState(5);
  const [seconds, setSeconds] = useState(120);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleStart = async () => {
    if (!fromSession && !form.role.trim()) {
      setError("Please enter a target role.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const payload = fromSession
        ? {
            mode: "session",
            sessionId: session._id,
            numberOfQuestions: count,
            secondsPerQuestion: seconds,
          }
        : {
            mode: "fresh",
            ...form,
            difficulty,
            numberOfQuestions: count,
            secondsPerQuestion: seconds,
          };

      const res = await axiosInstance.post(API_PATHS.MOCK.START, payload);
      const mockId = res.data?.mock?._id;
      if (mockId) {
        onClose?.();
        navigate(`/mock-interview/${mockId}`);
      } else {
        setError("Could not start the mock interview. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white w-full max-w-xl rounded-2xl shadow-lg p-6 relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
        aria-label="Close"
      >
        <LuX size={20} />
      </button>

      <h2 className="text-xl font-bold text-gray-900">Start a Mock Interview</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">
        {fromSession
          ? `Practise answering questions from "${session.role}" under a timer. You'll be scored by AI.`
          : "Answer realistic questions under a timer, then get instant AI scoring and feedback."}
      </p>

      {/* Role fields — locked when starting from a session */}
      {!fromSession && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Target Role</label>
            <input
              name="role"
              value={form.role}
              onChange={handleChange}
              placeholder="e.g., Frontend Developer"
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Experience (yrs)</label>
              <input
                name="experience"
                value={form.experience}
                onChange={handleChange}
                placeholder="e.g., 2"
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Topics</label>
              <input
                name="topicsToFocus"
                value={form.topicsToFocus}
                onChange={handleChange}
                placeholder="e.g., React, Node"
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Difficulty</label>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium border-2 transition ${
                    difficulty === d.value
                      ? d.active
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Number of questions */}
      <div className="mt-4">
        <label className="text-sm font-medium text-gray-700 block mb-2">Questions</label>
        <div className="flex gap-2">
          {QUESTION_COUNTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCount(c)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${
                count === c
                  ? "bg-indigo-50 text-indigo-700 border-indigo-400"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Time per question */}
      <div className="mt-4">
        <label className="text-sm font-medium text-gray-700 block mb-2">Time per question</label>
        <div className="flex gap-2">
          {TIMER_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSeconds(t.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${
                seconds === t.value
                  ? "bg-indigo-50 text-indigo-700 border-indigo-400"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full mt-6 inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold hover:from-indigo-600 hover:to-blue-700 transition shadow-sm disabled:opacity-60"
      >
        {loading ? (
          <>
            <LuLoader size={18} className="animate-spin" /> Preparing questions…
          </>
        ) : (
          <>
            <LuPlay size={18} /> Begin interview
          </>
        )}
      </button>
    </div>
  );
};

export default MockSetupForm;