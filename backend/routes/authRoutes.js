const express = require("express");
const router  = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
} = require("../controller/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register",  authLimiter, registerUser);
router.post("/login",     authLimiter, loginUser);
router.get("/profile",  protect, getUserProfile);
router.put("/profile",  protect, updateUserProfile);    // ← update name / email
router.put("/change-password", protect, changePassword); // ← change password

module.exports = router;
