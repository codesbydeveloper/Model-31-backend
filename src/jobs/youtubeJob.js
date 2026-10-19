const { checkYouTubeComments } = require("../services/youtubeService");

const TEN_MINUTES_MS = 10 * 60 * 1000;
let started = false;

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
  if (!youtubeConfigured()) {
    console.log(
      "YouTube comments are not configured. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN, and YOUTUBE_CHANNEL_ID."
    );
    return;
  }
  started = true;
  console.log("Checking YouTube comments...");
  checkYouTubeComments();
  setInterval(() => {
    console.log("Checking YouTube comments...");
    checkYouTubeComments();
  }, TEN_MINUTES_MS);
}

module.exports = { startYouTubeJob };
