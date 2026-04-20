import React from "react";
import { motion } from "framer-motion";
import { LuCircleAlert, LuListCollapse } from "react-icons/lu";
import AnswerRenderer from "../AnswerRenderer";

// ── Skeleton loader ──────────────────────────────────────────────────────────
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
    <div className="h-4 bg-gray-300 rounded w-full"></div>
    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    <div className="mt-6 h-4 bg-gray-300 rounded w-1/2"></div>
    <div className="h-20 bg-gray-300 rounded"></div>
  </div>
);

// ── ExplanationDrawer ────────────────────────────────────────────────────────
const ExplanationDrawer = ({ data, isLoading, error, onClose }) => {
  const getTitle = (d) => {
    if (!d || typeof d === "string") return null;
    return d?.title || d?.data?.title || null;
  };

  const getExplanation = (d) => {
    if (!d) return null;
    if (typeof d === "string") return d;
    return (
      d?.explanation ||
      d?.content ||
      d?.data?.explanation ||
      d?.message ||
      JSON.stringify(d, null, 2)
    );
  };

  const title       = getTitle(data);
  const explanation = getExplanation(data);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto p-5 border-l border-gray-200 bg-white shadow-sm rounded-lg xl:mr-8"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">Learn More</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Collapse panel"
        >
          <LuListCollapse size={22} />
        </button>
      </div>

      <div className="prose prose-sm max-w-none">
        {/* Loading */}
        {isLoading && <SkeletonLoader />}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-center space-x-2 text-red-600 p-3 bg-red-50 rounded-lg">
            <LuCircleAlert size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Content */}
        {data && !isLoading && !error && (
          <div className="space-y-4">
            {title && (
              <h2 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">
                {title}
              </h2>
            )}
            <AnswerRenderer answer={explanation} />
          </div>
        )}

        {/* Empty state */}
        {!data && !isLoading && !error && (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">
              Click &quot;Learn more&quot; on any question to get a detailed explanation.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ExplanationDrawer;