import React from "react";
import { Link } from "react-router-dom";
import { LuSparkles, LuGithub, LuLinkedin, LuTwitter } from "react-icons/lu";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "Prep Kit", to: "/prep-kit" },
      { label: "Mock Interview", to: "/mock" },
      { label: "Analytics", to: "/analytics" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Question Bank", to: "/prep-kit" },
      { label: "Behavioral Guide", to: "/prep-kit?cat=behavioral" },
      { label: "System Design", to: "/prep-kit?cat=system" },
      { label: "DSA Topics", to: "/prep-kit?cat=dsa" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Privacy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
    ],
  },
];

const Footer = ({ compact = false }) => {
  return (
    <footer className={`border-t border-slate-100 ${compact ? "bg-transparent" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                <LuSparkles className="text-white" size={18} />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Interview<span className="gradient-text">Edge</span>
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-3 max-w-xs leading-relaxed">
              AI-powered interview preparation — personalized questions, timed mock
              interviews, and instant feedback for any role.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[LuGithub, LuLinkedin, LuTwitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 flex items-center justify-center transition"
                  aria-label="social link"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-bold text-slate-900 mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-slate-500 hover:text-indigo-600 transition"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} InterviewEdge. Built for candidates, by candidates.
          </p>
          <p className="text-xs text-slate-400">Made with AI · Not affiliated with any employer.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
