import React from "react";
import { LuTrash2 } from "react-icons/lu";
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
}) => {
  return (
    <div
      className="bg-white border border-gray-300/40 rounded-xl p-2 overflow-hidden group relative" // Added 'group' and 'relative' for hover effects and positioning
      onClick={onSelect}
    >
      <div
        className="rounded-lg p-4 cursor-pointer relative"
        style={{
          background: colors.bgcolor,
        }}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 w-12 h-12 bg-white rounded-md flex items-center justify-center">
            <span className="text-lg font-semibold text-black">
              {getInitials(role)}
              {/* Assuming this is a static text or a placeholder for an icon/initials */}
            </span>
          </div>

          {/* Content Container */}
          <div className="flex-grow ml-4">
            {" "}
            {/* Added ml-4 for spacing */}
            <div className="flex justify-between items-start">
              {/* Title and Skills */}
              <div>
                <h2 className="text-[17px] font-medium text-black">{role}</h2>
                <p className="text-sm text-gray-600">{topicsToFocus}</p>
              </div>
              {/* Delete Button (appears on hover) */}
              <button
                className="hidden group-hover:flex items-center gap-2 text-xs text-red-500 hover:text-red-700 absolute top-2 right-2 px-2 py-1 bg-white rounded-md shadow-sm" // Positioned absolutely within the colored div
                onClick={(e) => {
                  e.stopPropagation(); // Prevent onSelect from triggering when delete is clicked
                  onDelete();
                }}
              >
                <LuTrash2 />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 mt-4">
          <div className="text-[10px] font-medium text-black px-3 py-1 border border-gray-200 rounded-full">
            Experience: {experience} {experience === 1 ? "Year" : "Years"}
          </div>
          <div className="text-[10px] font-medium text-black px-3 py-1 border border-gray-200 rounded-full">
            {questions} Q&A
          </div>
          <div className="text-[10px] font-medium text-black px-3 py-1 border border-gray-200 rounded-full">
            Last Updated: {lastUpdated}
          </div>
        </div>

        {/* Description */}
        <p className="text-[12px] text-gray-500 font-medium line-clamp-2 mt-3">
          {description}
        </p>
      </div>
    </div>
  );
};

export default SummaryCard;
