import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/userContext"; // Adjust the path as needed

const ProfileInfoCard = () => {
  const { user, clearUser } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Clear local storage
    clearUser(); // Clear user from context
    navigate("/"); // Navigate to homepage
  };

  return (
    <div className="flex  items-center">
      {/* Avatar with user's initial */}
      <div className="w-11 h-11 bg-amber-500 text-white rounded-full mr-3 flex items-center justify-center font-bold text-lg">
        {user?.name?.[0]?.toUpperCase() || "U"}
      </div>

      {/* Name and Logout in vertical column */}
      <div className="flex flex-col">
        <div className="text-[15px] text-black font-bold">
          {user?.name || ""}
        </div>
        <button
          className="text-amber-600 text-sm font-semibold cursor-pointer hover:underline"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileInfoCard;
