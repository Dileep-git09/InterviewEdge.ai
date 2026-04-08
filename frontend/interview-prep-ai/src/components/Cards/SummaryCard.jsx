import React from "react";
import { LuTrash2, LuFileText } from "react-icons/lu";
import { getInitials } from "../../utils/helper";

const SummaryCard = ({
  colors,
  role,
  topicsToFocus,
  experience,
  questions,
  description,
  lastUpdated,
  onSelect,
  onDelete,
  source,          // "manual" | "resume"
  resumeFileName,  // original filename when source === "resume"
}) => {
  const isResume = source === "resume";

  return (
    <div
      className="bg-white border border-gray-300/40 rounded-xl p-2 overflow-hidden group relative cursor-pointer"
      onClick={onSelect}
    >
      <div
        className="rounded-lg p-4 relative"
        style={{ background: colors.bgcolor }}
      >
        <div className="flex items-start">
          {/* Avatar / icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-md flex items-center justify-center">
            {isResume ? (
              <LuFileText size={22} className="text-blue-500" />
            ) : (
              <span className="text-lg font-semibold text-black">
                {getInitials(role)}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex-grow ml-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[17px] font-medium text-black truncate">
                    {role}
                  </h2>
                  {/* Resume badge */}
                  {isResume && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                      Resume
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {isResume
                    ? resumeFileName || topicsToFocus
                    : topicsToFocus}
                </p>
              </div>

              {/* Delete button — appears on hover */}
              <button
                className="hidden group-hover:flex items-center gap-1 text-xs text-red-500 hover:text-red-700 absolute top-2 right-2 px-2 py-1 bg-white rounded-md shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <LuTrash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer badges */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {!isResume && (
            <div className="text-[10px] font-medium text-black px-3 py-1 border border-gray-200 rounded-full">
              Experience: {experience} {experience === 1 ? "Year" : "Years"}
            </div>
          )}
          <div className="text-[10px] font-medium text-black px-3 py-1 border border-gray-200 rounded-full">
            {questions} Q&amp;A
          </div>
          <div className="text-[10px] font-medium text-black px-3 py-1 border border-gray-200 rounded-full">
            Last Updated: {lastUpdated}
          </div>
        </div>

        <p className="text-[12px] text-gray-500 font-medium line-clamp-2 mt-3">
          {description}
        </p>
      </div>
    </div>
  );
};

export default SummaryCard;