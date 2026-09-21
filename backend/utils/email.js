const nodemailer = require("nodemailer");

// ─────────────────────────────────────────────────────────────────────────────
// sendEmail — pluggable, provider-agnostic (works with Gmail app passwords,
// SendGrid/Mailgun/Resend/etc.'s SMTP relay, or any other SMTP host).
//
// ENV vars needed to send real email:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (optional, defaults
//   to SMTP_USER)
//
// Without them configured, this logs the email to the console instead of
// throwing — so the forgot-password flow is fully testable in dev without a
// real mail provider. Wire up real SMTP credentials before relying on this
// in production; nothing will actually be delivered until you do.
// ─────────────────────────────────────────────────────────────────────────────

let cachedTransporter = null;
const isConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return cachedTransporter;
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    console.warn(
      `[email] SMTP not configured — logging instead of sending.\n` +
      `  To:      ${to}\n` +
      `  Subject: ${subject}\n` +
      `  Body:\n${text}\n`
    );
    return { delivered: false, mode: "console" };
  }

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return { delivered: true, mode: "smtp" };
};

module.exports = { sendEmail, isConfigured };
