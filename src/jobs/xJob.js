const { checkX } = require("../services/xService");
const SocialAccount = require("../models/SocialAccount");

const TWO_MINUTES_MS = 2 * 60 * 1000;
let started = false;
let missingKeysLogged = false;

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
  started = true;

  const tick = async () => {
    if (!(await SocialAccount.hasConnected("X"))) return;
    if (!xConfigured()) {
      if (!missingKeysLogged) {
        missingKeysLogged = true;
        console.log(
          "X is connected for a dealership, but the server keys are missing. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_SECRET."
        );
      }
      return;
    }
    console.log("Checking X mentions and DMs...");
    await checkX();
  };

  tick().catch((err) => console.error("X check failed:", err.message));
  setInterval(() => {
    tick().catch((err) => console.error("X check failed:", err.message));
  }, TWO_MINUTES_MS);
}

module.exports = { startXJob };
