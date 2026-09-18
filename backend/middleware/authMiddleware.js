const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    // Token is valid but the account no longer exists (deleted / revoked).
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user no longer exists" });
    }

    // Token predates a password change or "log out everywhere" request —
    // reject it even though its signature and expiry are still valid.
    if ((decoded.tokenVersion || 0) !== user.tokenVersion) {
      return res.status(401).json({ message: "Session expired, please log in again." });
    }

    req.user = user;
    next();
  } catch (error) {
    // Invalid signature, expired token, malformed token, etc.
    return res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }
};

module.exports = { protect };
