const express = require("express");
const router = express.Router();
const {
  startMockInterview,
  submitAnswer,
  completeMockInterview,
  getMockInterview,
  getMyMockInterviews,
  deleteMockInterview,
} = require("../controller/mockInterviewController");
const { protect } = require("../middleware/authMiddleware");

// All mock-interview routes are private
router.post("/start",            protect, startMockInterview);
router.get("/my",                protect, getMyMockInterviews);
router.post("/:id/answer",       protect, submitAnswer);
router.post("/:id/complete",     protect, completeMockInterview);
router.get("/:id",               protect, getMockInterview);
router.delete("/:id",            protect, deleteMockInterview);

module.exports = router;