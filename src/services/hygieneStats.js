const pool = require("../config/database");

let autoPatchCount = 0;
let schemaDriftCount = 0;
let quarantineCount = 0;
let totalLeads = 0;
let loaded = false;

function snapshot() {
  return {
    autoPatchCount,
    schemaDriftCount,
    quarantineCount,
    totalLeads,
  };
}

async function loadHygieneStats() {
  const [rows] = await pool.query("SELECT * FROM crm_hygiene_stats WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (row) {
    autoPatchCount = Number(row.auto_patch_count) || 0;
    schemaDriftCount = Number(row.schema_drift_count) || 0;
    quarantineCount = Number(row.quarantine_count) || 0;
    totalLeads = Number(row.total_leads) || 0;
  }
  loaded = true;
  return snapshot();
}

async function persist() {
  if (!loaded) return;
  await pool.query(
    `UPDATE crm_hygiene_stats
     SET auto_patch_count = ?, schema_drift_count = ?, quarantine_count = ?, total_leads = ?
     WHERE id = 1`,
    [autoPatchCount, schemaDriftCount, quarantineCount, totalLeads]
  );
}

async function recordHygieneOutcome({ autoPatch = false, schemaDrift = false, quarantine = false } = {}) {
  totalLeads += 1;
  if (autoPatch) autoPatchCount += 1;
  if (schemaDrift) schemaDriftCount += 1;
  if (quarantine) quarantineCount += 1;
  try {
    await persist();
  } catch (err) {
    console.error("[HYGIENE-STATS] persist failed:", err.message);
  }
  return snapshot();
}

function getHygieneSnapshot() {
  return snapshot();
}

module.exports = {
  loadHygieneStats,
  recordHygieneOutcome,
  getHygieneSnapshot,
};
