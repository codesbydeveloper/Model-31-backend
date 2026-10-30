const { processSmsQueue } = require("../services/smsWorkerService");

const TICK_MS = 5000;
let started = false;

function startSmsJob() {
  if (started) return;
  started = true;
  console.log("SMS worker started");
  const tick = () => {
    processSmsQueue().catch((err) => {
      console.error("[SMS] Worker failed:", err.message);
    });
  };
  tick();
  setInterval(tick, TICK_MS);
}

module.exports = { startSmsJob };
