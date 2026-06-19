import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LuSparkles, LuArrowRight, LuBrain, LuTarget, LuFileText,
  LuTrendingUp, LuUsers, LuCheck, LuStar, LuLayoutDashboard,
  LuZap, LuShield, LuChevronDown,
} from "react-icons/lu";
import { UserContext } from "../context/userContext";

// ─────────────────────────────────────────────────────────────────
// Scroll-reveal hook — Apple-style: elements slide up & fade in
// as they enter the viewport, each with its own delay.
// ─────────────────────────────────────────────────────────────────
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = el.dataset.delay || "0";
            setTimeout(() => el.classList.add("revealed"), Number(delay));
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

// ─────────────────────────────────────────────────────────────────
// Animated counter for the stats bar
// ─────────────────────────────────────────────────────────────────
const Counter = ({ end, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1600;
        const steps = 60;
        const increment = end / steps;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + increment, end);
          setCount(Math.floor(current));
          if (current >= end) clearInterval(timer);
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (el) io.observe(el);
    return () => io.disconnect();
  }, [end]);

  return <span ref={ref}>{count}{suffix}</span>;
};

// ─────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: LuBrain,
    title: "AI questions, built for you",
    desc: "Not generic lists. Questions shaped around your exact role, experience level, and the topics you care about.",
    accent: "from-violet-500 to-indigo-600",
    light: "bg-violet-50 text-violet-600",
  },
  {
    icon: LuTarget,
    title: "Timed mock interviews",
    desc: "Answer under a real countdown. Get an AI score with strengths, gaps, and a model answer — every time.",
    accent: "from-indigo-500 to-blue-600",
    light: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: LuFileText,
    title: "Resume → Questions",
    desc: "Upload your CV and get section-by-section questions an interviewer would actually ask about your projects.",
    accent: "from-blue-500 to-cyan-500",
    light: "bg-blue-50 text-blue-600",
  },
  {
    icon: LuTrendingUp,
    title: "Progress analytics",
    desc: "Track scores, streaks, and topic coverage. Always know exactly what to practice next.",
    accent: "from-emerald-500 to-teal-500",
    light: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: LuUsers,
    title: "Community top questions",
    desc: "See what other candidates for your role pin most. Real signal from real prep.",
    accent: "from-amber-500 to-orange-500",
    light: "bg-amber-50 text-amber-600",
  },
  {
    icon: LuZap,
    title: "Instant explanations",
    desc: "Tap any concept for a deep-dive explanation. No more switching tabs to look things up.",
    accent: "from-rose-500 to-pink-500",
    light: "bg-rose-50 text-rose-600",
  },
];

const PREP_TOPICS = [
  { title: "Arrays & Hashing", pct: 70, tag: "DSA", color: "bg-indigo-600" },
  { title: "System Design",    pct: 48, tag: "Architecture", color: "bg-violet-600" },
  { title: "React Deep Dive",  pct: 62, tag: "Frontend", color: "bg-blue-600" },
  { title: "Behavioral (STAR)",pct: 90, tag: "Soft skills", color: "bg-emerald-600" },
  { title: "Dynamic Programming", pct: 40, tag: "DSA", color: "bg-rose-600" },
  { title: "Node.js & APIs",   pct: 55, tag: "Backend", color: "bg-amber-600" },
];

const TESTIMONIALS = [
  {
    quote: "The timed mock felt exactly like the real thing. The AI feedback caught gaps I didn't even know I had.",
    name: "Aditya R.",
    role: "SDE-2 at a product startup",
    score: 91,
  },
  {
    quote: "Generating questions from my resume saved me hours. Every question was relevant to my actual projects.",
    name: "Sneha K.",
    role: "Frontend Developer",
    score: 87,
  },
  {
    quote: "Went from rambling to structured STAR answers in one week of daily mocks. Got the offer.",
    name: "Marcus T.",
    role: "PM candidate",
    score: 94,
  },
];

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAuthed = Boolean(user || localStorage.getItem("token"));

  useReveal();

  return (
    <>
      {/* ── Global styles injected once ─────────────────────────── */}
      <style>{`
        /* Reveal keyframe */
        [data-reveal] {
          opacity: 0;
          transform: translateY(36px);
          transition: opacity 0.75s cubic-bezier(.22,1,.36,1),
                      transform 0.75s cubic-bezier(.22,1,.36,1);
          will-change: opacity, transform;
        }
        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* Subtle scale-in variant */
        [data-reveal="scale"] {
          transform: scale(0.95) translateY(24px);
        }
        [data-reveal="scale"].revealed {
          transform: scale(1) translateY(0);
        }

        /* Left/right slide variants */
        [data-reveal="left"] { transform: translateX(-40px); }
        [data-reveal="left"].revealed { transform: translateX(0); }
        [data-reveal="right"] { transform: translateX(40px); }
        [data-reveal="right"].revealed { transform: translateX(0); }

        /* Sticky nav blur */
        .apple-nav {
          backdrop-filter: saturate(180%) blur(20px);
          -webkit-backdrop-filter: saturate(180%) blur(20px);
          background: rgba(255,255,255,0.82);
          border-bottom: 1px solid rgba(0,0,0,0.08);
        }

        /* Hero headline gradient */
        .hero-gradient {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #a855f7 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Ambient glow blobs */
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          pointer-events: none;
        }
        .blob-1 { width: 520px; height: 520px; background: radial-gradient(circle, #818cf8, #c4b5fd); top: -120px; left: -100px; animation: blobmove 12s ease-in-out infinite alternate; }
        .blob-2 { width: 420px; height: 420px; background: radial-gradient(circle, #a5b4fc, #e879f9); top: 60px; right: -80px; animation: blobmove 15s ease-in-out infinite alternate-reverse; }
        @keyframes blobmove { from { transform: translate(0,0) scale(1); } to { transform: translate(30px, 20px) scale(1.08); } }

        /* Apple-style section divider */
        .apple-divider { border-top: 1px solid rgba(0,0,0,0.08); }

        /* Dark section */
        .dark-section { background: #080808; color: #f5f5f7; }
        .dark-section p, .dark-section span { color: rgba(245,245,247,0.7); }

        /* Feature card hover */
        .feat-card {
          border: 1px solid rgba(0,0,0,0.07);
          transition: transform 0.3s cubic-bezier(.22,1,.36,1),
                      box-shadow 0.3s cubic-bezier(.22,1,.36,1),
                      border-color 0.3s;
        }
        .feat-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 60px rgba(79,70,229,0.12);
          border-color: rgba(99,102,241,0.25);
        }

        /* Prep topic bar animation */
        .topic-bar { transition: width 1.2s cubic-bezier(.22,1,.36,1); }

        /* Score ring pulse */
        @keyframes ringpulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 0 10px rgba(16,185,129,0); } }
        .score-ring { animation: ringpulse 2.5s ease-in-out infinite; }

        /* Nav link hover */
        .nav-link { position: relative; }
        .nav-link::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:1.5px; background:#6366f1; transition:width .25s; }
        .nav-link:hover::after { width:100%; }

        /* CTA button shine */
        .btn-primary {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary::before {
          content:'';
          position:absolute;
          top:0; left:-75%;
          width:50%; height:100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transition: left 0.5s;
        }
        .btn-primary:hover::before { left:125%; }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 40px rgba(99,102,241,0.45); }
        .btn-primary:active { transform: translateY(0); }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          [data-reveal], .blob, .topic-bar { transition: none !important; animation: none !important; }
          [data-reveal] { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      <div style={{ fontFamily: "-apple-system, SF Pro Display, SF Pro Text, Helvetica Neue, Arial, sans-serif" }}
        className="bg-white overflow-x-hidden">

        {/* ══════════════════════════════════════════════
            NAV — translucent, sticky, Apple-style
        ══════════════════════════════════════════════ */}
        <nav className="apple-nav sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <LuSparkles className="text-white" size={16} />
              </div>
              <span className="text-[17px] font-semibold tracking-tight text-gray-900">
                Interview<span style={{ color: "#6366f1" }}>Edge</span>
              </span>
            </Link>

            {/* Nav links — desktop */}
            <div className="hidden md:flex items-center gap-8">
              {[["#features","Features"],["#how","How it works"],["#kit","Prep Kit"],["#reviews","Reviews"]].map(([href, label]) => (
                <a key={href} href={href}
                  className="nav-link text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                  {label}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-2">
              {isAuthed ? (
                <button onClick={() => navigate("/dashboard")}
                  className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-white">
                  <LuLayoutDashboard size={14} /> Dashboard
                </button>
              ) : (
                <>
                  <Link to="/login"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 transition mr-1 hidden sm:block">
                    Log in
                  </Link>
                  <Link to="/signup"
                    className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-white">
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════
            HERO — full-viewport, centered, Apple large
        ══════════════════════════════════════════════ */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden"
          style={{ background: "linear-gradient(160deg, #fafafe 0%, #f4f3ff 50%, #fdf4ff 100%)" }}>

          {/* Ambient blobs */}
          <div className="blob blob-1" />
          <div className="blob blob-2" />

          {/* Eyebrow */}
          <div data-reveal data-delay="0"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8"
            style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.2)" }}>
            <LuSparkles size={12} />
            AI-powered interview coaching
          </div>

          {/* Main headline — Apple scale */}
          <h1 data-reveal data-delay="80"
            className="font-bold tracking-tight text-gray-900 leading-none mb-6"
            style={{ fontSize: "clamp(2.6rem, 8vw, 6.5rem)", letterSpacing: "-0.03em", maxWidth: "900px" }}>
            Ace your next<br />
            <span className="hero-gradient">interview.</span>
          </h1>

          {/* Sub-headline */}
          <p data-reveal data-delay="160"
            className="text-gray-500 leading-relaxed mb-10 max-w-xl"
            style={{ fontSize: "clamp(1rem, 2.2vw, 1.25rem)" }}>
            Role-specific questions. Timed mocks with AI scoring.<br className="hidden sm:block" />
            Resume analysis. All in one place.
          </p>

          {/* CTAs */}
          <div data-reveal data-delay="240" className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <Link to="/signup"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-semibold text-white">
              Start for free <LuArrowRight size={16} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-base font-medium text-gray-700 transition"
              style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
            >
              I have an account
            </Link>
          </div>

          <p data-reveal data-delay="300" className="flex items-center gap-1.5 text-xs text-gray-400 mb-16">
            <LuShield size={12} /> No credit card · Free to start
          </p>

          {/* Hero product card */}
          <div data-reveal="scale" data-delay="400"
            className="w-full max-w-3xl mx-auto rounded-3xl overflow-hidden"
            style={{
              background: "white",
              boxShadow: "0 40px 100px rgba(79,70,229,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
            }}>
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.015)" }}>
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 text-center">
                <span className="text-[11px] text-gray-400 font-medium">InterviewEdge · Mock Interview</span>
              </div>
            </div>

            {/* App content */}
            <div className="p-6 sm:p-8" style={{ background: "linear-gradient(135deg, #fafafe, #f4f3ff)" }}>
              <div className="flex items-start justify-between mb-6">
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#6366f1" }}>
                    Live mock · Q3 of 10
                  </p>
                  <p className="text-xl font-bold text-gray-900">Frontend Developer · Medium</p>
                  <p className="text-sm text-gray-400 mt-0.5">⏱ 01:47 remaining</p>
                </div>
                <div className="score-ring w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-extrabold text-emerald-600 text-xl bg-white flex-shrink-0 ml-4">
                  82
                </div>
              </div>

              {/* Question */}
              <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: "1px solid rgba(0,0,0,0.07)" }}>
                <p className="text-gray-800 font-semibold mb-4">
                  Explain the React reconciliation process and how the virtual DOM improves performance.
                </p>
                {/* Answer area preview */}
                <div className="rounded-xl p-3.5 text-sm text-gray-500 text-left leading-relaxed"
                  style={{ background: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.05)" }}>
                  React uses a virtual DOM to batch updates and minimise real DOM mutations.
                  When state changes, React creates a new virtual tree and diffs it against
                  the previous one using the reconciliation algorithm…
                  <span className="inline-block w-0.5 h-4 ml-1 bg-indigo-500 align-middle animate-pulse" />
                </div>
              </div>

              {/* AI feedback chips */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>
                  ✓ Clear structure
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>
                  ↑ Add a concrete example
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#4f46e5" }}>
                  View model answer
                </span>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-300">
            <span className="text-[10px] font-medium uppercase tracking-widest">Scroll</span>
            <LuChevronDown size={18} className="animate-bounce" />
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            STATS BAR — dark, Apple style
        ══════════════════════════════════════════════ */}
        <section className="dark-section">
          <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { end: 10, suffix: "k+", label: "Questions generated" },
              { end: 50, suffix: "+",  label: "Roles supported" },
              { end: 48, suffix: "/5", label: "Avg. mock rating", display: "4.8/5" },
              { end: 24, suffix: "/7", label: "AI availability",  display: "24/7" },
            ].map((s, i) => (
              <div key={i} data-reveal data-delay={i * 80}>
                <p className="text-4xl font-bold mb-1" style={{ color: "white" }}>
                  {s.display ? s.display : <><Counter end={s.end} suffix={s.suffix} /></>}
                </p>
                <p className="text-sm" style={{ color: "rgba(245,245,247,0.55)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FEATURES — big Apple-grid layout
        ══════════════════════════════════════════════ */}
        <section id="features" className="py-28 px-6"
          style={{ background: "linear-gradient(180deg, #fff 0%, #fafafe 100%)" }}>
          <div className="max-w-6xl mx-auto">
            {/* Section label */}
            <div data-reveal className="text-center mb-20">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#6366f1" }}>
                Everything you need
              </p>
              <h2 className="font-bold text-gray-900 tracking-tight"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.025em" }}>
                One tool. Complete prep.
              </h2>
              <p className="text-gray-400 mt-4 max-w-xl mx-auto text-lg">
                Every feature is designed around how real technical interviews actually work.
              </p>
            </div>

            {/* Bento grid — big top row, smaller below */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Big featured card */}
              <div data-reveal="scale" data-delay="0"
                className="feat-card md:col-span-2 rounded-3xl p-8 sm:p-10 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%)", minHeight: "340px" }}>
                <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-20"
                  style={{ background: "radial-gradient(circle, #818cf8, transparent)", transform: "translate(30%, 30%)" }} />
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  <LuBrain className="text-white" size={22} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">AI questions, built for you</h3>
                <p className="text-gray-500 text-base max-w-sm leading-relaxed">
                  Not generic lists. Questions shaped around your exact role, experience level,
                  and the topics you care about — generated fresh every session.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {["React", "Node.js", "MongoDB", "System Design"].map(t => (
                    <span key={t} className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#4f46e5" }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Tall right card */}
              <div data-reveal="scale" data-delay="100"
                className="feat-card rounded-3xl p-7 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", minHeight: "340px" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <LuTarget className="text-white" size={22} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Timed mock interviews</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Real countdown. Real pressure. AI-scored feedback with a model answer after each question.
                </p>
                {/* Score preview */}
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center font-extrabold text-emerald-600 text-xl bg-white">
                    91
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Great answer</p>
                    <p className="text-xs text-gray-400 mt-0.5">Strong structure, clear example</p>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              {FEATURES.slice(2).map((f, i) => (
                <div key={f.title}
                  data-reveal="scale"
                  data-delay={String((i + 1) * 80)}
                  className="feat-card rounded-3xl p-7 bg-white"
                  style={{ minHeight: "200px" }}>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${f.light}`}>
                    <f.icon size={20} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1.5">{f.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            HOW IT WORKS — Apple "steps" style
        ══════════════════════════════════════════════ */}
        <section id="how" className="py-28 px-6" style={{ background: "#f5f5f7" }}>
          <div className="max-w-5xl mx-auto">
            <div data-reveal className="text-center mb-20">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#6366f1" }}>How it works</p>
              <h2 className="font-bold text-gray-900 tracking-tight"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.025em" }}>
                Three steps to confident.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: "Pick your role",
                  desc: "Choose any role and experience level, or let InterviewEdge read your resume and figure it out.",
                  color: "#4f46e5",
                  light: "#eef2ff",
                },
                {
                  step: "2",
                  title: "Practice with AI",
                  desc: "Generate a question set, run a timed mock, or explore explanations. Your call, your pace.",
                  color: "#7c3aed",
                  light: "#f5f3ff",
                },
                {
                  step: "3",
                  title: "See yourself improve",
                  desc: "Your analytics show score trends, topic gaps, and streak — so you always know what's working.",
                  color: "#059669",
                  light: "#f0fdf4",
                },
              ].map((s, i) => (
                <div key={s.step}
                  data-reveal
                  data-delay={String(i * 120)}
                  className="relative bg-white rounded-3xl p-8"
                  style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
                  {/* Step circle */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg mb-6"
                    style={{ background: s.light, color: s.color }}>
                    {s.step}
                  </div>
                  {/* Connector line on desktop */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-14 right-0 w-8 h-px translate-x-full"
                      style={{ background: "rgba(0,0,0,0.1)" }} />
                  )}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            PREP KIT — full-width dark with topic bars
        ══════════════════════════════════════════════ */}
        <section id="kit" className="py-28 px-6 dark-section">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left copy */}
              <div>
                <p data-reveal className="text-sm font-semibold tracking-widest uppercase mb-4"
                  style={{ color: "#818cf8" }}>Curated Prep Kit</p>
                <h2 data-reveal data-delay="80"
                  className="font-bold tracking-tight mb-6"
                  style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", letterSpacing: "-0.025em", color: "white" }}>
                  Practice what<br />companies actually test.
                </h2>
                <p data-reveal data-delay="160" className="mb-8 text-base leading-relaxed">
                  Every topic shows how frequently it appears in real interviews, so you know where to spend your time.
                </p>
                <div data-reveal data-delay="240">
                  <Link to="/signup"
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white">
                    Explore Prep Kit <LuArrowRight size={15} />
                  </Link>
                </div>
              </div>

              {/* Right — topic bars */}
              <div className="space-y-4">
                {PREP_TOPICS.map((t, i) => (
                  <div key={t.title}
                    data-reveal="right"
                    data-delay={String(i * 80)}
                    className="rounded-2xl p-4"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-white">{t.title}</span>
                        <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}>
                          {t.tag}
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                        {t.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className={`h-full rounded-full topic-bar ${t.color}`}
                        style={{ width: `${t.pct}%` }} />
                    </div>
                    <p className="text-[11px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      of companies test this topic
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            TESTIMONIALS — Apple card row
        ══════════════════════════════════════════════ */}
        <section id="reviews" className="py-28 px-6"
          style={{ background: "linear-gradient(180deg, #fafafe 0%, #fff 100%)" }}>
          <div className="max-w-6xl mx-auto">
            <div data-reveal className="text-center mb-16">
              <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: "#6366f1" }}>
                Real results
              </p>
              <h2 className="font-bold text-gray-900 tracking-tight"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.025em" }}>
                Candidates who got the offer.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, i) => (
                <div key={t.name}
                  data-reveal="scale"
                  data-delay={String(i * 100)}
                  className="feat-card bg-white rounded-3xl p-7"
                  style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.05)" }}>
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <LuStar key={j} size={14} fill="#f59e0b" className="text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">"{t.quote}"</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.role}</p>
                    </div>
                    {/* Score badge */}
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-500 flex items-center justify-center font-extrabold text-emerald-600 bg-emerald-50 text-sm">
                      {t.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FINAL CTA — Apple full-width gradient
        ══════════════════════════════════════════════ */}
        <section className="py-36 px-6 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, #4338ca 0%, #6d28d9 45%, #7c3aed 100%)" }}>
          {/* Subtle mesh overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

          <div className="relative max-w-3xl mx-auto">
            <h2 data-reveal
              className="font-bold text-white tracking-tight mb-5"
              style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
              Your next interview<br />starts today.
            </h2>
            <p data-reveal data-delay="80"
              className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>
              Free to start. No credit card. Just better prep.
            </p>
            <div data-reveal data-delay="160" className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup"
                className="inline-flex items-center gap-2 px-9 py-4 rounded-full text-base font-semibold text-indigo-700 bg-white hover:bg-gray-50 transition"
                style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.15)" }}>
                Create free account <LuArrowRight size={17} />
              </Link>
              <button onClick={() => navigate("/login")}
                className="text-white font-medium text-sm hover:underline opacity-80 hover:opacity-100 transition">
                Already have an account →
              </button>
            </div>

            {/* Trust badges */}
            <div data-reveal data-delay="240"
              className="flex flex-wrap items-center justify-center gap-6 mt-12 text-sm"
              style={{ color: "rgba(255,255,255,0.55)" }}>
              {["Free forever plan","Any role or tech stack","AI feedback in seconds","No card required"].map(x => (
                <span key={x} className="flex items-center gap-2">
                  <LuCheck size={14} className="text-white opacity-70" /> {x}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            FOOTER — minimal Apple style
        ══════════════════════════════════════════════ */}
        <footer style={{ background: "#f5f5f7", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    <LuSparkles className="text-white" size={13} />
                  </div>
                  <span className="font-semibold text-gray-900">InterviewEdge</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[180px]">
                  AI-powered interview coaching. Free to start.
                </p>
              </div>
              {[
                { heading: "Product", links: ["Dashboard","Prep Kit","Mock Interview","Analytics"] },
                { heading: "Resources", links: ["Question Bank","Behavioral Guide","System Design","DSA Topics"] },
                { heading: "Company",  links: ["About","Privacy","Terms","Contact"] },
              ].map((col) => (
                <div key={col.heading}>
                  <p className="text-xs font-bold text-gray-800 mb-3 uppercase tracking-wide">{col.heading}</p>
                  <ul className="space-y-2">
                    {col.links.map(l => (
                      <li key={l}>
                        <Link to="/signup" className="text-xs text-gray-400 hover:text-gray-700 transition">{l}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="pt-6" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} InterviewEdge. Built for candidates, by candidates. Not affiliated with any employer.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default LandingPage;