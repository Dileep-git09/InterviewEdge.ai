import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import hero_img from "../assets/hero-img.jpg";
import { APP_FEATURES } from "../utils/data";
import Modal from "../components/Modal";
import Login from "./Auth/Login";
import SignUp from "./Auth/SignUp";
import { UserContext } from "../context/userContext";
import ProfileInfoCard from "../components/Cards/ProfileInfoCard";

const LandingPage = () => {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [currentPage, setCurrentPage] = useState("login");

  const handleCTA = () => {
    if (!user) {
      setOpenAuthModal(true);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#fcfbfc] font-display text-gray-800 overflow-x-hidden">
      {/* Navbar */}
      <div className="flex justify-between items-center px-8 py-6 shadow-sm bg-white">
        <div className="text-2xl font-bold text-black">InterviewEdge</div>
        {user ? (
          <ProfileInfoCard />
        ) : (
          <button className="btn-small" onClick={() => setOpenAuthModal(true)}>
            Login / Sign Up
          </button>
        )}
      </div>

      {/* Hero Section */}
      <div className="flex flex-col-reverse lg:flex-row items-center justify-between px-10 lg:px-24 py-14 lg:py-20 gap-12">
        {/* Text Content */}
        <div className="w-full lg:w-1/2 space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
            Master Every Interview <br /> with AI-Powered Guidance
          </h1>
          <p className="text-gray-700 text-lg">
            Prepare smarter, not harder. Get role-specific questions, instant
            explanations, and detailed feedback — all tailored to your learning
            style.
          </p>
          <button
            className="btn-primary w-fit px-6 py-3 rounded mt-4 hover:scale-105 transition-transform"
            onClick={handleCTA}
          >
            Get Started For Free
          </button>
        </div>

        {/* Hero Image */}
        <div className="w-full lg:w-1/2 flex justify-center">
          <img
            src={hero_img}
            alt="Hero"
            className="w-full max-w-md rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="px-10 lg:px-24 py-20 bg-white">
        <h2 className="text-3xl font-bold mb-10 text-center text-gray-900">
          Why Choose InterviewEdge?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {APP_FEATURES.map((feature) => (
            <div
              key={feature.id}
              className="p-6 border border-gray-200 rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-xl transition-shadow duration-300 hover:scale-[1.02]"
            >
              <div className="mb-3 w-12 h-12 bg-[#FF9324]/20 text-[#FF9324] flex items-center justify-center rounded-full font-bold text-lg">
                {feature.id}
              </div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900">
                {feature.title}
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="text-center py-14 bg-[#f7f6f5] px-6">
        <h3 className="text-2xl font-semibold mb-4 text-gray-900">
          Ready to Land Your Dream Role?
        </h3>
        <p className="mb-6 text-gray-700 max-w-xl mx-auto">
          Join thousands of job seekers using AI to personalize their interview
          preparation and get hired with confidence.
        </p>
        <button
          className="btn-primary px-6 py-3 rounded hover:scale-105 transition-transform"
          onClick={handleCTA}
        >
          Start Preparing Now
        </button>
      </div>

      {openAuthModal && (
        <Modal
          isOpen={openAuthModal}
          onClose={() => {
            setOpenAuthModal(false);
            setCurrentPage("login");
          }}
          title={currentPage === "login" ? "Login" : "Sign Up"}
        >
          <div className="p-6 w-full max-w-md">
            {currentPage === "login" && (
              <Login setCurrentPage={setCurrentPage} />
            )}
            {currentPage === "signup" && (
              <SignUp setCurrentPage={setCurrentPage} />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LandingPage;
