const rawEmails = process.env.MODEL31_ALLOWED_EMAILS || "";

const MODEL31_ALLOWED_EMAILS = new Set(
  rawEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0)
);

module.exports = { MODEL31_ALLOWED_EMAILS };
