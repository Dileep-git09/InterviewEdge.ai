import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Home/Dashboard";
import InterviewPrep from "./pages/interviewPrep/interviewPrep";
import ResumePrep from "./pages/ResumePrep/ResumePrep";
import UserProvider from "./context/userContext";

const App = () => {
  return (
    <UserProvider>
      <Router>
        <div>
          <Routes>
            <Route path="/"                          element={<LandingPage />} />
            <Route path="/login"                     element={<Login />} />
            <Route path="/signup"                    element={<SignUp />} />
            <Route path="/dashboard"                 element={<Dashboard />} />
            <Route path="/interview-prep/:sessionId" element={<InterviewPrep />} />
            {/* Resume-based prep — session ID from MongoDB, supports revisiting */}
            <Route path="/resume-prep/:sessionId"    element={<ResumePrep />} />
          </Routes>

          <Toaster
            toastOptions={{
              className: "",
              style: { fontSize: "13px" },
            }}
          />
        </div>
      </Router>
    </UserProvider>
  );
};

export default App;