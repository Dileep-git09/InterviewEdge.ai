import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuX, LuLoader, LuSparkles } from "react-icons/lu";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosinstance";

const DIFFICULTIES = [
  {
    value: "easy",
    label: "Easy",
    color: "bg-emerald-50 text-emerald-700 border-emerald-300",
    hint: "Conceptual & beginner-friendly",
  },
  {
    value: "medium",
    label: "Medium",
    color: "bg-amber-50 text-amber-700 border-amber-300",
    hint: "Applied knowledge & moderate problem-solving",
  },
  {
    value: "hard",
    label: "Hard",
    color: "bg-rose-50 text-rose-700 border-rose-300",
    hint: "Deep expertise, system design & advanced concepts",
  },
];

const CreateSessionForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    role: "",
    experience: "",
    topicsToFocus: "",
    description: "",
  });
  const [difficulty, setDifficulty] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    const { role, experience, topicsToFocus } = formData;

    if (!role || !experience || !topicsToFocus) {
      setError("Please fill in all required fields.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const aiResponse = await axiosInstance.post(API_PATHS.AI.GENERATE_QUESTIONS, {
        role,
        experience,
        topicsToFocus,
        numberOfQuestions: 10,
        difficulty,
      });

      const generatedQuestions = aiResponse.data;

      const response = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
        ...formData,
        difficulty,
        questions: generatedQuestions,
      });

      if (response.data?.session?._id) {
        navigate(`/interview-prep/${response.data.session._id}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDiff = DIFFICULTIES.find((d) => d.value === difficulty);

  return (
    /* ── Compact centred card — NOT a full-screen overlay ── */
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <LuSparkles size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              New Interview Session
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              AI-generated questions tailored to you
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close"
        >
          <LuX size={18} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 my-4" />

      {/* Form */}
      <form onSubmit={handleCreateSession} className="space-y-3">
        {/* Role */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Target Role <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="role"
            value={formData.role}
            onChange={handleChange}
            placeholder="e.g. Frontend Developer"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Experience */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Years of Experience <span className="text-rose-400">*</span>
          </label>
          <input
            type="number"
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            placeholder="e.g. 2"
            min="0"
            max="30"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Topics */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Topics to Focus <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            name="topicsToFocus"
            value={formData.topicsToFocus}
            onChange={handleChange}
            placeholder="e.g. React, Node.js, MongoDB"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                  difficulty === d.value
                    ? d.color + " border-2"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          {selectedDiff && (
            <p className="text-[11px] text-slate-400 mt-1.5">{selectedDiff.hint}</p>
          )}
        </div>

        {/* Notes (optional, compact) */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Additional Notes{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Any specific requirements or focus areas…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <LuLoader size={14} className="animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Questions"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSessionForm;
