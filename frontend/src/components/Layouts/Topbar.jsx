import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuMenu, LuSearch } from "react-icons/lu";
import ProfileInfoCard from "../Cards/ProfileInfoCard";

const Topbar = ({ title, subtitle, onMenu }) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submitSearch = (e) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/prep-kit?q=${encodeURIComponent(term)}` : "/prep-kit");
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-slate-100">
      <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
        <button
          onClick={onMenu}
          className="lg:hidden text-slate-600 hover:text-slate-900 p-1"
          aria-label="Open menu"
        >
          <LuMenu size={22} />
        </button>

        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate leading-tight">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-400 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>

        {/* Functional search -> Prep Kit */}
        <form
          onSubmit={submitSearch}
          className="hidden md:flex items-center gap-2 bg-slate-100/70 hover:bg-slate-100 focus-within:ring-2 focus-within:ring-indigo-300 rounded-xl px-3 py-2 w-64 transition"
        >
          <LuSearch size={16} className="text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search topics, roles…"
            className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
          />
        </form>

        <ProfileInfoCard />
      </div>
    </header>
  );
};

export default Topbar;
