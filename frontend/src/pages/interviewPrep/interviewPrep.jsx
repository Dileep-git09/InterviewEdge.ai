import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import moment from "moment";
import { AnimatePresence, motion } from "framer-motion";
import { API_PATHS } from "../../utils/apiPaths";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
import RoleInfoHeader from "./components/RoleInfoHeader";
import axiosInstance from "../../utils/axiosinstance";
import QuestionCard from "../../components/Cards/QuestionCard";
import TopQuestionsPanel from "../../components/Cards/TopQuestionsPanel";
import toast from "react-hot-toast";
import ExplanationDrawer from "../../components/Cards/ExplanationDrawer";

const InterviewPrep = () => {
  const { sessionId } = useParams();
  const [sessionData, setSessionData]               = useState(null);
  const [errorMsg, setErrorMsg]                     = useState("");
  const [openLeanMoreDrawer, setOpenLeanMoreDrawer] = useState(false);
  const [explanation, setExplanation]               = useState(null);
  const [isLoading, setIsLoading]                   = useState(false);
  const [isUpdateLoader, setIsUpdateLoader]         = useState(false);

  const fetchSessionDetailsById = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.SESSION.GET_ONE(sessionId)
      );
      if (response.data && response.data.session) {
        setSessionData(response.data.session);
      }
    } catch (error) {
      console.error("Error fetching session:", error);
    }
  };

  const generateConceptExplanation = async (question) => {
    try {
      setErrorMsg("");
      setExplanation(null);
      setIsLoading(true);
      setOpenLeanMoreDrawer(true);

      const response = await axiosInstance.post(
        API_PATHS.AI.GENERATE_EXPLANATION,
        { question }
      );

      if (response.data) setExplanation(response.data);
    } catch (error) {
      setExplanation(null);
      setErrorMsg("Failed to generate explanation. Try again later.");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMoreQuestions = async () => {
    setIsUpdateLoader(true);
    try {
      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_QUESTIONS,
        {
          role:              sessionData?.role,
          experience:        sessionData?.experience,
          topicsToFocus:     sessionData?.topicsToFocus,
          numberOfQuestions: 10,
          difficulty:        sessionData?.difficulty || "medium",
        }
      );

      const generatedQuestions = aiResponse.data;

      const response = await axiosInstance.post(
        API_PATHS.QUESTION.ADD_TO_SESSION,
        { sessionId, questions: generatedQuestions }
      );

      if (response.data) {
        toast.success("Added More Q&A!");
        fetchSessionDetailsById();
      }
    } catch (error) {
      if (error.response && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsUpdateLoader(false);
    }
  };

  const toggleQuestionPinStatus = async (questionId) => {
    try {
      const response = await axiosInstance.post(
        API_PATHS.QUESTION.PIN(questionId)
      );
      if (response.data && response.data.success) {
        const sessionResponse = await axiosInstance.get(
          API_PATHS.SESSION.GET_ONE(sessionId)
        );
        if (sessionResponse.data && sessionResponse.data.session) {
          setSessionData(sessionResponse.data.session);
        }
      }
    } catch (error) {
      console.error("Error toggling pin:", error);
    }
  };

  useEffect(() => {
    if (sessionId) fetchSessionDetailsById();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <DashboardLayout>
      <RoleInfoHeader
        role={sessionData?.role || ""}
        topicsToFocus={sessionData?.topicsToFocus || ""}
        experience={sessionData?.experience || "-"}
        questions={sessionData?.questions?.length || "-"}
        description={sessionData?.description || ""}
        lastUpdated={
          sessionData?.updatedAt
            ? moment(sessionData.updatedAt).format("Do MMM YYYY")
            : ""
        }
      />

      <div className="container mx-auto pt-4 pb-4 px-4 md:px-0 md:ml-8">
        <div className="grid grid-cols-12 gap-6 mt-5 mb-10">
          {/* Main content column */}
          <div
            className={`col-span-12 transition-all duration-300 ${
              openLeanMoreDrawer ? "md:col-span-7" : "md:col-span-8"
            }`}
          >
            {/* ── Top Questions Panel ─────────────────────────────────────
                Shown above the generated Q&A. Fetches by role so all users
                preparing for the same role see the same important questions.
                The panel hides itself if there are no questions for this role.
            ─────────────────────────────────────────────────────────────── */}
            {sessionData?.role && (
              <TopQuestionsPanel role={sessionData.role} />
            )}

            {/* ── Generated Q&A ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 md:ml-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Interview Q &amp; A
              </h2>
              {sessionData?.difficulty && (
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    sessionData.difficulty === "easy"
                      ? "bg-green-100 text-green-800"
                      : sessionData.difficulty === "hard"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {sessionData.difficulty.charAt(0).toUpperCase() +
                    sessionData.difficulty.slice(1)}
                </span>
              )}
            </div>

            <AnimatePresence>
              {(sessionData?.questions || []).map((data, index) => (
                <motion.div
                  key={data._id || index}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.4,
                    type: "spring",
                    stiffness: 100,
                    delay: index * 0.1,
                    damping: 15,
                  }}
                  layout
                  layoutId={`question-${data._id || index}`}
                >
                  <QuestionCard
                    question={data?.question}
                    answer={data?.answer}
                    difficulty={data?.difficulty}
                    onLearnMore={() => generateConceptExplanation(data.question)}
                    isPinned={data?.isPinned}
                    onTogglePin={() => toggleQuestionPinStatus(data._id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              onClick={uploadMoreQuestions}
              disabled={isUpdateLoader}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md mt-4 md:ml-4 ${
                isUpdateLoader
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-blue-700"
              }`}
            >
              {isUpdateLoader ? "Loading..." : "Load More"}
            </button>
          </div>

          {/* Explanation drawer */}
          <AnimatePresence>
            {openLeanMoreDrawer && (
              <motion.div className="col-span-12 md:col-span-5" layout>
                <ExplanationDrawer
                  data={explanation}
                  isLoading={isLoading}
                  error={errorMsg}
                  onClose={() => setOpenLeanMoreDrawer(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default InterviewPrep;