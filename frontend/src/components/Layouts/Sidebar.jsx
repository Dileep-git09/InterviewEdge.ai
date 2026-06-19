import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuBookOpen,
  LuTarget,
  LuTrendingUp,
  LuSparkles,
  LuX,
} from "react-icons/lu";

const NAV = [
  { to: "/dashboard",  label: "Dashboard",      icon: LuLayoutDashboard },
  { to: "/prep-kit",   label: "Prep Kit",       icon: LuBookOpen },
  { to: "/mock",       label: "Mock Interview", icon: LuTarget },
  { to: "/analytics",  label: "Analytics",      icon: LuTrendingUp },
];

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();

  const linkBase =
    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200";

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-100 flex flex-col
          transition-transform duration-300 lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-glow">
              <LuSparkles className="text-white" size={18} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Interview<span className="gradient-text">Edge</span>
            </span>
          </button>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-700">
            <LuX size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-3.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            Menu
          </p>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-soft"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    className={isActive ? "text-indigo-600" : "text-slate-400"}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
            );
          })}
        </nav>

        {/* Upgrade / tip card */}
        <div className="p-4">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white shadow-glow">
            <p className="text-sm font-bold">Practice daily 🔥</p>
            <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
              Run one timed mock a day to keep your edge sharp.
            </p>
            <button
              onClick={() => { onClose?.(); navigate("/mock"); }}
              className="mt-3 w-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold py-2 rounded-lg transition"
            >
              Start a mock →
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
