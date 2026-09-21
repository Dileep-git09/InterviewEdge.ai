// ─────────────────────────────────────────────────────────────────────────────
// monitoring — optional Sentry wiring.
//
// Inert unless SENTRY_DSN is set. Free-tier accounts exist at sentry.io;
// once you have a DSN, set it and every 5xx response, uncaught exception, and
// unhandled rejection starts flowing there automatically — nothing else to
// change. Without it, this is a no-op, matching the "graceful when a
// dependency isn't configured" pattern used for Redis/Groq elsewhere in this
// codebase.
// ─────────────────────────────────────────────────────────────────────────────

let Sentry = null;

const init = () => {
  if (!process.env.SENTRY_DSN) return false;
  Sentry = require("@sentry/node");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
  console.log("Sentry monitoring enabled.");
  return true;
};

const captureException = (err) => {
  if (Sentry) Sentry.captureException(err);
};

module.exports = { init, captureException };
