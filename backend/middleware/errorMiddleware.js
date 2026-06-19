// ─────────────────────────────────────────────────────────────────────────────
// Centralized error handling.
//
// Express 5 automatically forwards errors thrown in async route handlers here,
// so every controller failure ends up in one place with a consistent JSON shape
// and the correct HTTP status code. Stack traces are only exposed outside
// production to avoid leaking internals to clients.
// ─────────────────────────────────────────────────────────────────────────────

const { MulterError } = require("multer");

// 404 — route not matched. Mounted AFTER all routes.
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Final error handler. Mounted LAST (after notFound).
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || "Internal server error";

  // ── Upload errors (multer) ────────────────────────────────────────────────
  if (err instanceof MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. Maximum allowed size is 5 MB."
        : `Upload error: ${err.message}`;
  }
  // ── Invalid Mongo ObjectId → 404 (resource can't exist) ────────────────────
  else if (err.name === "CastError" && err.kind === "ObjectId") {
    status = 404;
    message = "Resource not found.";
  }
  // ── Mongoose validation → 400 ──────────────────────────────────────────────
  else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  // ── Duplicate key (e.g. email already exists) → 409 ────────────────────────
  else if (err.code === 11000) {
    status = 409;
    message = "A record with that value already exists.";
  }
  // ── Invalid / expired JWT → 401 ────────────────────────────────────────────
  else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Not authorized, token invalid or expired.";
  }

  if (status >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
