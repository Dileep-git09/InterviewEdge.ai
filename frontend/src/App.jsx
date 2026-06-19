import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import UserProvider from "./context/userContext";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import Dashboard from "./pages/Home/Dashboard";
import InterviewPrep from "./pages/interviewPrep/interviewPrep";
import ResumePrep from "./pages/ResumePrep/ResumePrep";
import MockInterview from "./pages/MockInterview/MockInterview";
import MockStart from "./pages/MockInterview/MockStart";
import Analytics from "./pages/Analytics/Analytics";
import PrepKit from "./pages/PrepKit/PrepKit";
import MyProfile from "./pages/Profile/MyProfile";

// Simple guard — redirect to /login if no token is present
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <UserProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{ duration: 4000, style: { maxWidth: 380 } }}
        />
        <Routes>
          {/* Public */}
          <Route path="/"       element={<LandingPage />} />
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

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
      </Router>
    </UserProvider>
  );
}

export default App;
