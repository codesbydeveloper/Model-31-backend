const { checkX } = require("../services/xService");

const TWO_MINUTES_MS = 2 * 60 * 1000;
let started = false;

function xConfigured() {
  return Boolean(
    process.env.X_API_KEY &&
      process.env.X_API_SECRET &&
      process.env.X_ACCESS_TOKEN &&
      process.env.X_ACCESS_SECRET
  );
}

function startXJob() {
  if (started) return;
  if (!xConfigured()) {
    console.log(
      "X is not configured. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_SECRET."
    );
    return;
  }
  started = true;
  console.log("Checking X mentions and DMs...");
  checkX();
  setInterval(() => {
    console.log("Checking X mentions and DMs...");
    checkX();
  }, TWO_MINUTES_MS);
}

module.exports = { startXJob };
