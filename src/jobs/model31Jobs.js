const { MODEL31_ALLOWED_EMAILS } = require("../config/model31Access");
const { loadHygieneStats } = require("../services/hygieneStats");
const { loadMeltPlateState, runCrmMeltPlateCheck } = require("../services/crmMeltPlate");
const { recalculatePerformanceBands } = require("../services/routingEngineService");
const { runInactionGuard } = require("../services/salespersonGuardService");

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SLA_TICK_MS = 60 * 1000;

let started = false;

async function startModel31Jobs() {
  if (started) return;
  started = true;

  if (MODEL31_ALLOWED_EMAILS.size === 0) {
    console.warn(
      "MODEL31_ALLOWED_EMAILS is empty. Sealed /api/model31 routes will block every user until C-suite emails are set."
    );
  }

  await loadHygieneStats();
  await loadMeltPlateState();
  try {
    await recalculatePerformanceBands();
  } catch (err) {
    console.error("[MODEL31] band sync failed:", err.message);
  }

  setInterval(() => {
    runCrmMeltPlateCheck().catch((err) => {
      console.error("[CRM-MELT-PLATE] check failed:", err.message);
    });
  }, FOUR_HOURS_MS);

  setInterval(() => {
    recalculatePerformanceBands().catch((err) => {
      console.error("[MODEL31] weekly band sync failed:", err.message);
    });
  }, WEEK_MS);

  setInterval(() => {
    runInactionGuard().catch((err) => {
      console.error("[INACTION-GUARD] failed:", err.message);
    });
  }, SLA_TICK_MS);
}

module.exports = { startModel31Jobs };
