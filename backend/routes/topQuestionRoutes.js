const express = require("express");
const router = express.Router();
const { getTopQuestions } = require("../controller/topQuestionController");

// GET /api/top-questions?role=frontend+developer&limit=10
// Public — no auth required (CDN can cache this freely)
router.get("/", getTopQuestions);

module.exports = router;