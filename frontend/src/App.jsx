import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { LuLoader } from "react-icons/lu";

import UserProvider from "./context/userContext";

// Route-level code splitting — each page ships as its own chunk, fetched on
// navigation instead of all being bundled into the single initial download.
const LandingPage     = lazy(() => import("./pages/LandingPage"));
const Login           = lazy(() => import("./pages/Auth/Login"));
const SignUp          = lazy(() => import("./pages/Auth/SignUp"));
const ForgotPassword  = lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword   = lazy(() => import("./pages/Auth/ResetPassword"));
const Dashboard       = lazy(() => import("./pages/Home/Dashboard"));
const InterviewPrep   = lazy(() => import("./pages/interviewPrep/interviewPrep"));
const ResumePrep      = lazy(() => import("./pages/ResumePrep/ResumePrep"));
const MockInterview   = lazy(() => import("./pages/MockInterview/MockInterview"));
const MockStart       = lazy(() => import("./pages/MockInterview/MockStart"));
const Analytics       = lazy(() => import("./pages/Analytics/Analytics"));
const PrepKit         = lazy(() => import("./pages/PrepKit/PrepKit"));
const MyProfile       = lazy(() => import("./pages/Profile/MyProfile"));

// Simple guard — redirect to /login if no token is present
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center text-slate-400">
    <LuLoader size={28} className="animate-spin" />
  </div>
);

function App() {
  return (
    <UserProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{ duration: 4000, style: { maxWidth: 380 } }}
        />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/"       element={<LandingPage />} />
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password"      element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protected */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/interview-prep/:sessionId" element={<ProtectedRoute><InterviewPrep /></ProtectedRoute>} />
            <Route path="/resume-prep/:sessionId"    element={<ProtectedRoute><ResumePrep /></ProtectedRoute>} />
            <Route path="/mock"                      element={<ProtectedRoute><MockStart /></ProtectedRoute>} />
            <Route path="/mock-interview/:mockId"    element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
            <Route path="/analytics"                 element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/prep-kit"                  element={<ProtectedRoute><PrepKit /></ProtectedRoute>} />
            <Route path="/profile"                   element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </UserProvider>
  );
}

export default App;
