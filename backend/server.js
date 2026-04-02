require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const questionRoutes = require("./routes/questionRoutes");
const { protect } = require("./middleware/authMiddleware");
const {
  generateInterviewQuestions,
  generateConceptExplanation,
  generateQuestionsFromResume,
} = require("./controller/aiController");

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

connectDB();

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Static uploads folder ─────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Multer: memory storage for resume uploads (no disk writes needed) ─────────
// Accepts PDF, DOC, DOCX only. Max 5 MB.
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExt = ["pdf", "doc", "docx"];
    const ext = file.originalname.split(".").pop().toLowerCase();

    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are accepted."), false);
    }
  },
});

// ── Auth & resource routes ────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionRoutes);

// ── AI routes ─────────────────────────────────────────────────────────────────
app.post("/api/ai/generate-questions", generateInterviewQuestions);
app.post("/api/ai/generate-explanation", generateConceptExplanation);

// New: resume upload + question generation (protected — user must be logged in)
app.post(
  "/api/ai/generate-from-resume",
  protect,
  resumeUpload.single("resume"), // "resume" must match the FormData field name on the frontend
  generateQuestionsFromResume
);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});