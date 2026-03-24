import React from "react";
import { Link } from "react-router-dom";
import ProfileInfoCard from "../Cards/ProfileInfoCard";
import { Sparkles } from "lucide-react"; // Optional icon

const Navbar = () => {
  return (
    <div className="h-16 bg-white/70 backdrop-blur-md border-b border-gray-200 shadow-md">
      <div className="mx-auto max-w-screen-xl px-6 flex items-center justify-between h-full gap-5">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 group transition-all"
        >
          {/* Optional: Icon */}
          <Sparkles
            className="text-blue-600 group-hover:rotate-6 transition-transform duration-300"
            size={20}
          />
          <h2 className="text-xl font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
            InterviewEdge
          </h2>
        </Link>
        <ProfileInfoCard />
      </div>
    </div>
  );
};

export default Navbar;
