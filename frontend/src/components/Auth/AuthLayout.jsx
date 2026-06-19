import React from "react";
import { Link } from "react-router-dom";
import { LuSparkles, LuBrain, LuTarget, LuTrendingUp } from "react-icons/lu";

const POINTS = [
  { icon: LuBrain, text: "AI-tailored questions for your exact role" },
  { icon: LuTarget, text: "Timed mock interviews with instant scoring" },
  { icon: LuTrendingUp, text: "Track your progress and beat your best" },
];

// Split-screen shell used by Login and SignUp.
const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 blur-3xl rounded-full" />

        <Link to="/" className="relative flex items-center gap-2 text-white">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <LuSparkles size={20} />
          </div>
          <span className="text-xl font-extrabold tracking-tight">InterviewEdge</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-extrabold text-white leading-tight">
            Prepare smarter.<br />Interview with confidence.
          </h2>
          <p className="text-indigo-100 mt-3 max-w-sm">
            Your personal AI interview coach — questions, mock interviews, and feedback
            tailored to you.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.text} className="flex items-center gap-3 text-white">
                  <span className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} />
                  </span>
                  <span className="text-sm">{p.text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200">
          © {new Date().getFullYear()} InterviewEdge. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <Link to="/" className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <LuSparkles className="text-white" size={18} />
            </div>
            <span className="text-lg font-extrabold tracking-tight">
              Interview<span className="gradient-text">Edge</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
