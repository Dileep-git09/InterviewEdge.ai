import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  LuSearch, LuPlay, LuLoader, LuArrowRight, LuBookOpen, LuTarget, LuX,
} from "react-icons/lu";
import toast from "react-hot-toast";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import { PREP_TOPICS, PREP_CATEGORIES } from "../../utils/prepKitData";
import { Card, ProgressBar } from "../../components/ui/primitives";
import Badge from "../../components/ui/Badge";

const PrepKit = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [startingId, setStartingId] = useState(null);
  const searchInputRef = useRef(null);

  // Pick up ?q= and ?cat= from the URL
  useEffect(() => {
    const q = searchParams.get("q");
    const cat = searchParams.get("cat");
    if (q) setQuery(q);
    if (cat && PREP_CATEGORIES.some((c) => c.id === cat)) setCategory(cat);
  }, [searchParams]);

  // ── Live filter — reacts instantly on every keystroke ──────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PREP_TOPICS.filter((t) => {
      const inCat = category === "all" || t.category === category;
      if (!inCat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.topicsToFocus.toLowerCase().includes(q) ||
        (t.blurb && t.blurb.toLowerCase().includes(q))
      );
    });
  }, [category, query]);

  // Highlight matched text inside a string
  const highlight = (text, q) => {
    if (!q.trim()) return text;
    const regex = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-indigo-100 text-indigo-800 rounded px-0.5 not-italic">{part}</mark>
        : part
    );
  };

  const clearSearch = () => {
    setQuery("");
    searchInputRef.current?.focus();
  };

  // Generate a real AI session for this topic, then open it
  const startTopic = async (topic) => {
    if (startingId) return;
    setStartingId(topic.id);
    const loadingId = toast.loading(`Generating "${topic.title}" questions…`);
    try {
      const ai = await axiosInstance.post(API_PATHS.AI.GENERATE_QUESTIONS, {
        role: topic.role,
        experience: "2",
        topicsToFocus: topic.topicsToFocus,
        numberOfQuestions: 10,
        difficulty: topic.difficulty,
      });

      const session = await axiosInstance.post(API_PATHS.SESSION.CREATE, {
        role: topic.role,
        experience: "2",
        topicsToFocus: topic.topicsToFocus,
        description: `${topic.title} — from Prep Kit`,
        difficulty: topic.difficulty,
        questions: ai.data,
      });

      toast.dismiss(loadingId);
      const id = session.data?.session?._id;
      if (id) navigate(`/interview-prep/${id}`);
      else toast.error("Could not start this topic. Please try again.");
    } catch (err) {
      toast.dismiss(loadingId);
      toast.error(err.response?.data?.message || "Failed to generate questions.");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <DashboardLayout title="Prep Kit" subtitle="Topic-based practice, the way companies test">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero strip */}
        <Card className="p-6 md:p-8 bg-gradient-to-br from-indigo-600 to-violet-600 border-0 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/15 px-3 py-1 rounded-full">
              <LuBookOpen size={13} /> Curated kit
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-3">
              Practice the concepts that show up most
            </h2>
            <p className="text-indigo-100 mt-2 text-sm md:text-base">
              Each topic spins up a fresh AI-generated session tailored to that concept.
              Start anywhere — your progress shows up on your dashboard.
            </p>
          </div>
        </Card>

        {/* ── Controls ── */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">

          {/* Search bar with live clear button */}
          <div className="relative flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-full md:w-80 shadow-soft focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400 transition">
            <LuSearch size={16} className="text-slate-400 flex-shrink-0" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics…"
              className="bg-transparent text-sm outline-none w-full text-slate-800 placeholder-slate-400"
              aria-label="Search topics"
            />
            {/* Clear button — only visible when there's a query */}
            {query && (
              <button
                onClick={clearSearch}
                className="flex-shrink-0 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Clear search"
              >
                <LuX size={14} />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {PREP_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`whitespace-nowrap text-sm font-medium px-3.5 py-2 rounded-lg border transition ${
                  category === c.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-soft"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Live result count ── */}
        {query && (
          <p className="text-sm text-slate-500">
            {filtered.length === 0
              ? "No topics match"
              : `${filtered.length} topic${filtered.length !== 1 ? "s" : ""} match`}
            {" "}<span className="font-semibold text-slate-700">"{query}"</span>
            <button
              onClick={clearSearch}
              className="ml-2 text-indigo-600 hover:underline text-xs font-medium"
            >
              Clear
            </button>
          </p>
        )}

        {/* ── Grid ── */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <LuSearch size={22} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">No topics match your search</p>
            <p className="text-sm text-slate-400 mt-1">
              Try a different keyword or{" "}
              <button onClick={clearSearch} className="text-indigo-600 hover:underline font-medium">
                clear the filter
              </button>
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => {
              const busy = startingId === t.id;
              return (
                <Card key={t.id} hover className="p-5 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center">
                      <LuTarget size={20} />
                    </div>
                    <Badge difficulty={t.difficulty} />
                  </div>
                  <h3 className="font-bold text-slate-900 mt-3">
                    {highlight(t.title, query)}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed flex-1">
                    {highlight(t.blurb, query)}
                  </p>

                  <div className="mt-4">
                    <ProgressBar value={t.companyPct} showLabel={false} size="sm" />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      <span className="font-semibold text-slate-600">{t.companyPct}%</span> of companies test this
                    </p>
                  </div>

                  <button
                    onClick={() => startTopic(t)}
                    disabled={busy}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-60"
                  >
                    {busy ? (
                      <><LuLoader size={16} className="animate-spin" /> Generating…</>
                    ) : (
                      <><LuPlay size={15} /> Start practicing</>
                    )}
                  </button>
                </Card>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        <Card className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900">Want something specific?</p>
            <p className="text-sm text-slate-500">Generate a fully custom session for any role or topic.</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:underline"
          >
            Create custom session <LuArrowRight size={15} />
          </button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PrepKit;
