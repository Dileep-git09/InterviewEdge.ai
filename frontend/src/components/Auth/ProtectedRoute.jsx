import React, { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { UserContext } from "../../context/userContext";

// ─────────────────────────────────────────────────────────────────────────────
// ProtectedRoute
//
// Wraps private routes. While the profile is still loading we show a light
// loader instead of flashing the page; with no auth token we redirect to
// /login. (UserContext separately hard-redirects on a 401, so an expired token
// is handled there too.)
// ─────────────────────────────────────────────────────────────────────────────
const ProtectedRoute = () => {
  const { loading } = useContext(UserContext);
  const token = localStorage.getItem("token");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
