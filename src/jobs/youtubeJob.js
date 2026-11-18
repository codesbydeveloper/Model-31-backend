const { checkYouTubeComments } = require("../services/youtubeService");
const SocialAccount = require("../models/SocialAccount");

const FIVE_MINUTES_MS = 5 * 60 * 1000;
let started = false;
let missingKeysLogged = false;

function youtubeConfigured() {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
      process.env.YOUTUBE_CLIENT_SECRET &&
      process.env.YOUTUBE_REFRESH_TOKEN &&
      process.env.YOUTUBE_CHANNEL_ID
  );
}

function startYouTubeJob() {
  if (started) return;
  started = true;

  const tick = async () => {
    if (!(await SocialAccount.hasConnected("YouTube"))) return;
    if (!youtubeConfigured()) {
      if (!missingKeysLogged) {
        missingKeysLogged = true;
        console.log(
          "YouTube is connected for a dealership, but the server keys are missing. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, and YOUTUBE_CHANNEL_ID."
        );
      }
      return;
    }
    console.log("Checking YouTube comments...");
    await checkYouTubeComments();
  };

  tick().catch((err) => console.error("YouTube check failed:", err.message));
  setInterval(() => {
    tick().catch((err) => console.error("YouTube check failed:", err.message));
  }, FIVE_MINUTES_MS);
}

module.exports = { startYouTubeJob };
