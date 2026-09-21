const crypto = require("crypto");
const User = require("../models/User");
const Session = require("../models/Session");
const Question = require("../models/Question");
const MockInterview = require("../models/MockInterview");
const PinEvent = require("../models/PinEvent");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/email");

// ── Generate JWT ──────────────────────────────────────────────────────────────
// tokenVersion is embedded so it can be invalidated server-side without a
// blacklist — see `protect` in authMiddleware.js and `logoutAllDevices` below.
const generateToken = (userId, tokenVersion = 0) =>
  jwt.sign({ id: userId, tokenVersion }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── @route  POST /api/auth/register ──────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are all required." });
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) return res.status(409).json({ message: "An account with that email already exists." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashedPassword });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id, user.tokenVersion),
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ── @route  POST /api/auth/login ─────────────────────────────────────────────
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id, user.tokenVersion),
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ── @route  GET /api/auth/profile ────────────────────────────────────────────
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  PUT /api/auth/profile ────────────────────────────────────────────
// Update display name and/or email address.
// Does NOT touch the password — use /api/auth/change-password for that.
const updateUserProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty." });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email cannot be empty." });
    }

    // If the user changed their email, make sure no other account uses it already
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({ message: "That email is already in use by another account." });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim(), email: email.trim().toLowerCase() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("updateUserProfile error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  PUT /api/auth/change-password ────────────────────────────────────
// Verify the user's current password, then replace it with the new one.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both currentPassword and newPassword are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must differ from current password." });
    }

    // Fetch user WITH password (select("-password") is omitted here intentionally)
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    // Hash and save new password. Bump tokenVersion so every other
    // already-issued token (anyone who had this password, e.g. on another
    // device) is invalidated immediately — the standard "changing your
    // password logs out other sessions" behavior.
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.tokenVersion += 1;
    await user.save();

    // Issue a fresh token for *this* request's session so the user isn't
    // immediately logged out of the tab they just changed their password in.
    res.json({
      message: "Password changed successfully.",
      token: generateToken(user._id, user.tokenVersion),
    });
  } catch (error) {
    console.error("changePassword error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  POST /api/auth/logout-all ────────────────────────────────────────
// Invalidates every token currently issued to this user, including the one
// used to make this request — bumping tokenVersion is what "log out
// everywhere" means here, since there's no server-side token blacklist.
const logoutAllDevices = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    res.json({ message: "Logged out of all devices. Please log in again." });
  } catch (error) {
    console.error("logoutAllDevices error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  POST /api/auth/forgot-password ───────────────────────────────────
// Always responds with the same generic message regardless of whether the
// email exists — an enumeration-safe pattern, same as loginUser.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }

    const genericMessage = "If an account with that email exists, a password reset link has been sent.";
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (user) {
      // Raw token goes in the email link; only its hash is ever stored, so a
      // DB leak can't be used to reset anyone's password.
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL?.split(",")[0] || "http://localhost:5173"}/reset-password/${rawToken}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your InterviewEdge password",
        text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
        html: `<p>Reset your password: <a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
      });
    }

    res.status(200).json({ message: genericMessage });
  } catch (error) {
    console.error("forgotPassword error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  POST /api/auth/reset-password/:token ─────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordTokenHash +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ message: "This reset link is invalid or has expired." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpires = null;
    user.tokenVersion += 1; // invalidate every existing session, same as changePassword
    await user.save();

    res.status(200).json({
      message: "Password reset successfully. You're now logged in.",
      token: generateToken(user._id, user.tokenVersion),
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("resetPassword error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  GET /api/auth/export ─────────────────────────────────────────────
// Everything the app knows about this user, as one JSON download.
const exportUserData = async (req, res) => {
  try {
    const [user, sessions, mocks, pinEvents] = await Promise.all([
      User.findById(req.user.id).select("-password"),
      Session.find({ user: req.user.id }).populate("questions").lean(),
      MockInterview.find({ user: req.user.id }).lean(),
      PinEvent.find({ user: req.user.id }).lean(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found." });

    res.set("Content-Disposition", "attachment; filename=interviewedge-data-export.json");
    res.status(200).json({
      exportedAt: new Date().toISOString(),
      profile: user,
      sessions,
      mockInterviews: mocks,
      pinEvents,
    });
  } catch (error) {
    console.error("exportUserData error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  DELETE /api/auth/account ─────────────────────────────────────────
// Permanently deletes the account and every record owned by it. Requires the
// current password as confirmation — a valid-but-stolen session token alone
// shouldn't be enough to destroy the account.
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Enter your password to confirm account deletion." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

    const sessions = await Session.find({ user: user._id }).select("_id");
    await Question.deleteMany({ session: { $in: sessions.map((s) => s._id) } });
    await Session.deleteMany({ user: user._id });
    await MockInterview.deleteMany({ user: user._id });
    await PinEvent.deleteMany({ user: user._id });
    await User.deleteOne({ _id: user._id });

    res.status(200).json({ message: "Your account and all associated data have been deleted." });
  } catch (error) {
    console.error("deleteAccount error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ── @route  PUT /api/auth/leaderboard-preference ─────────────────────────────
// body: { optOut: boolean }
const updateLeaderboardPreference = async (req, res) => {
  try {
    const { optOut } = req.body;
    if (typeof optOut !== "boolean") {
      return res.status(400).json({ message: "optOut must be a boolean." });
    }
    await User.findByIdAndUpdate(req.user.id, { leaderboardOptOut: optOut });
    res.status(200).json({
      message: optOut ? "You're now hidden from leaderboards." : "You're now visible on leaderboards.",
      leaderboardOptOut: optOut,
    });
  } catch (error) {
    console.error("updateLeaderboardPreference error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
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
  updateLeaderboardPreference,
};
