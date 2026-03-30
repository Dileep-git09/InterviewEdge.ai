import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ProfileInfoCard from "../Cards/ProfileInfoCard";
import { Sparkles, ChevronLeft } from "lucide-react";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Show the back button on every page that uses DashboardLayout.
  // On /dashboard        → go back to the landing page (/)
  // On /interview-prep/* → go back to /dashboard
  // The button is hidden on any other path.
  const getBackDestination = () => {
    if (location.pathname === "/dashboard") return "/";
    if (location.pathname.startsWith("/interview-prep")) return "/dashboard";
    return null;
  };

  const backDestination = getBackDestination();

  return (
    <div className="h-16 bg-white/70 backdrop-blur-md border-b border-gray-200 shadow-md">
      <div className="mx-auto max-w-screen-xl px-6 flex items-center justify-between h-full gap-5">

        {/* Left side: optional back button + logo */}
        <div className="flex items-center gap-3">
          {/* Back button — only rendered when there is a valid destination */}
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

          {/* Divider — only shown when back button is visible */}
          {backDestination && (
            <span className="text-gray-300 select-none">|</span>
          )}

          {/* Logo */}
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

        {/* Right side: profile */}
        <ProfileInfoCard />
      </div>
    </div>
  );
};

export default Navbar;