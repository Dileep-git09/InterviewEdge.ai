const express = require("express");
const router  = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  logoutAllDevices,
  forgotPassword,
  resetPassword,
  exportUserData,
  deleteAccount,
} = require("../controller/authController");
const { protect } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register",  authLimiter, registerUser);
router.post("/login",     authLimiter, loginUser);
router.get("/profile",  protect, getUserProfile);
router.put("/profile",  protect, updateUserProfile);    // ← update name / email
router.put("/change-password", protect, changePassword); // ← change password
router.post("/logout-all", protect, logoutAllDevices);   // ← invalidate every issued token
router.post("/forgot-password",        authLimiter, forgotPassword);
router.post("/reset-password/:token",  authLimiter, resetPassword);
router.get("/export",     protect, exportUserData);      // ← download all my data
router.delete("/account", protect, deleteAccount);        // ← permanently delete account + data

module.exports = router;
