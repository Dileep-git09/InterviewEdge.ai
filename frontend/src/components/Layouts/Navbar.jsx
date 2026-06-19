import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ProfileInfoCard from "../Cards/ProfileInfoCard";
import { Sparkles, ChevronLeft } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getBackDestination = () => {
    if (location.pathname === "/dashboard") return "/";
    if (location.pathname.startsWith("/interview-prep")) return "/dashboard";
    if (location.pathname.startsWith("/resume-prep")) return "/dashboard";
    return null;
  };

  const backDestination = getBackDestination();

  return (
    // Fix 2: added `relative z-50` here.
    //
    // Root cause of the dropdown-behind-cards bug:
    // `backdrop-blur-md` automatically creates a new CSS stacking context for
    // the navbar element. Without an explicit z-index on the navbar itself, this
    // stacking context has no elevation, so anything painted after the navbar in
    // the DOM (the session cards) can render on top of it — including on top of
    // the dropdown that lives inside the navbar.
    //
    // Setting `relative z-50` on the navbar gives its entire stacking context a
    // z-index of 50, which is above the session cards (which have no z-index).
    // The dropdown inside ProfileInfoCard uses z-[200] for extra safety, but the
    // real fix is here — elevating the navbar's stacking context.
    <div className="relative z-50 h-16 bg-white/70 backdrop-blur-md border-b border-gray-200 shadow-md">
      <div className="mx-auto max-w-screen-xl px-6 flex items-center justify-between h-full gap-5">

        {/* Left side: optional back button + logo */}
        <div className="flex items-center gap-3">
          {backDestination && (
            <button
              onClick={() => navigate(backDestination)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors duration-200 group"
              aria-label="Go back"
            >
              <ChevronLeft
                size={18}
                className="group-hover:-translate-x-0.5 transition-transform duration-200"
              />
              <span className="hidden sm:inline font-medium">Back</span>
            </button>
          )}

          {backDestination && (
            <span className="text-gray-300 select-none">|</span>
          )}

          <Link
            to="/dashboard"
            className="flex items-center gap-2 group transition-all"
          >
            <Sparkles
              className="text-blue-600 group-hover:rotate-6 transition-transform duration-300"
              size={20}
            />
            <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
              InterviewEdge
            </h2>
          </Link>
        </div>

        {/* Right side: profile dropdown */}
        <ProfileInfoCard />
      </div>
    </div>
  );
};

export default Navbar;