const express = require("express");
const router = express.Router();
const { getLeaderboard } = require("../controller/leaderboardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getLeaderboard);

module.exports = router;
