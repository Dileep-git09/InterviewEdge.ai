import React from "react";

const RoleInfoHeader = ({
  role,
  topicsToFocus,
  experience,
  questions,
  description,
  lastUpdated,
}) => {
  return (
    <div className="bg-white relative px-6 md:px-12">
      <div className="container mx-auto px-10 md:px-0">
        <div className="h-[150px] flex flex-col justify-center relative z-10">
          <div className="flex items-start">
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-medium">{role}</h2>
                  <p className="text-sm text-medium text-gray-900 mt-1">
                    {topicsToFocus}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Animated Blobs */}
            <div className="absolute top-0 right-0 w-[40vw] md:w-[30vw] h-[200px] flex items-center justify-center z-0 pointer-events-none">
              <div className="w-16 h-16 bg-green-400 blur-[65px] animate-blob1"></div>
              <div className="w-16 h-16 bg-teal-400 blur-[65px] animate-blob2"></div>
              <div className="w-16 h-16 bg-cyan-300 blur-[45px] animate-blob3"></div>
              <div className="w-16 h-16 bg-fuchsia-200 blur-[45px] animate-blob1"></div>
            </div>

            {/* Badges content stays below */}
            <div className="flex items-center gap-3 mt-2 z-10 relative">
              <div className="text-[10px] font-semibold text-white bg-black px-2 py-1 rounded">
                Experience: {experience} {experience == 1 ? "Year" : "Years"}
              </div>
              <div className="text-[10px] font-semibold text-white bg-black px-2 py-1 rounded">
                {questions} Q&A
              </div>
              <div className="text-[10px] font-semibold text-white bg-black px-2 py-1 rounded">
                Last Updated: {lastUpdated}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleInfoHeader;
