import React, { useContext, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuLogOut,
  LuUser,
  LuChevronDown,
  LuUpload,
  LuFileText,
  LuLoader,
} from "react-icons/lu";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext";

// ── Reusable menu row ────────────────────────────────────────────────────────
const MenuItem = ({ icon, label, sublabel, onClick, disabled, badge }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 text-left
      ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-gray-50 cursor-pointer"
      }`}
  >
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {badge && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
            {badge}
          </span>
        )}
      </div>
      {sublabel && (
        <p className="text-xs text-gray-400 truncate mt-0.5">{sublabel}</p>
      )}
    </div>
  </button>
);

// ── ProfileInfoCard ──────────────────────────────────────────────────────────
const ProfileInfoCard = () => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    localStorage.clear();
    clearUser();
    navigate("/");
  };

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  // ── Resume upload ──────────────────────────────────────────────────────────
  const handleResumeClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    // Client-side type check
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExts = ["pdf", "doc", "docx"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error("Only PDF and Word documents are supported.");
      return;
    }

    // Client-side 5 MB guard
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5 MB.");
      return;
    }

    setIsOpen(false);
    setIsUploading(true);

    const loadingToastId = toast.loading(`Analysing ${file.name}…`);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await axiosInstance.post(
        API_PATHS.AI.GENERATE_FROM_RESUME,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Fix 1: removed unused `fileName` from destructuring — it caused an
      // ESLint "no-unused-vars" error because fileName was only used in the
      // old sessionStorage version and is no longer referenced in the toast.
      const { sessionId, sections } = response.data;
      const totalQ = sections.reduce((acc, s) => acc + s.questions.length, 0);

      toast.dismiss(loadingToastId);

      // Live action toast — stays 12 s, lets user navigate directly
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <LuFileText size={16} className="text-blue-600 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-800">
                Resume analysed &amp; saved!
              </p>
            </div>
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{totalQ} questions</span>{" "}
              across{" "}
              <span className="font-medium text-gray-700">
                {sections.length} section{sections.length !== 1 ? "s" : ""}
              </span>{" "}
              — session saved to your dashboard.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate(`/resume-prep/${sessionId}`);
                }}
                className="flex-1 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition"
              >
                View Questions →
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate("/dashboard");
                }}
                className="flex-1 py-1.5 rounded-md border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition"
              >
                Dashboard
              </button>
            </div>
          </div>
        ),
        {
          duration: 12000,
          style: { maxWidth: "320px" },
        }
      );
    } catch (error) {
      toast.dismiss(loadingToastId);
      const msg =
        error?.response?.data?.message ||
        "Failed to analyse resume. Please try again.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const avatarLetter = user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Trigger button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 group focus:outline-none"
        aria-label="Open profile menu"
        aria-expanded={isOpen}
        disabled={isUploading}
      >
        <div className="w-9 h-9 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm group-hover:ring-2 group-hover:ring-amber-400 group-hover:ring-offset-1 transition-all">
          {isUploading ? (
            <LuLoader size={16} className="animate-spin" />
          ) : (
            avatarLetter
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-sm font-semibold text-gray-800 max-w-[100px] truncate">
            {user?.name || ""}
          </span>
          <LuChevronDown
            size={14}
            className={`text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Fix 2: dropdown z-index raised to z-[200] so it renders above session
          cards even when the navbar's backdrop-blur creates a stacking context.
          See Navbar.jsx for the matching fix on the navbar's own z-index. */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[200]">

          {/* Profile header */}
          <div className="bg-gray-50 px-5 py-4 flex flex-col items-center text-center border-b border-gray-100">
            <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-md mb-2">
              {avatarLetter}
            </div>
            <p className="text-base font-semibold text-gray-900">
              {user?.name || ""}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-full">
              {user?.email || ""}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-2">
            <MenuItem
              icon={<LuLayoutDashboard size={16} />}
              label="My Sessions"
              sublabel="View all your interview sessions"
              onClick={() => handleNavigate("/dashboard")}
            />
            <MenuItem
              icon={<LuUpload size={16} />}
              label="Upload Resume"
              sublabel="Generate questions from your CV"
              onClick={handleResumeClick}
            />
            <MenuItem
              icon={<LuUser size={16} />}
              label="My Profile"
              sublabel="Edit name, email & password"
              disabled
              badge="Soon"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Logout */}
          <div className="py-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150"
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-500 flex-shrink-0">
                <LuLogOut size={14} />
              </span>
              <span className="font-medium">Log out</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

export default ProfileInfoCard;