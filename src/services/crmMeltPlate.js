const { randomUUID } = require("crypto");
const pool = require("../config/database");
const { getHygieneSnapshot } = require("./hygieneStats");

const THRESHOLDS = {
  MAX_AUTO_PATCH_RATE_PERCENT: 5,
  MAX_SCHEMA_DRIFT_EVENTS: 20,
  MAX_QUARANTINE_EVENTS: 10,
};

let fallbackParserActive = false;
let lastTriggerType = null;
let lastTriggeredAt = null;
let lastCheckedAt = null;

async function loadMeltPlateState() {
  const [rows] = await pool.query("SELECT * FROM crm_hygiene_stats WHERE id = 1 LIMIT 1");
  const row = rows[0];
  if (!row) return getMeltPlateStatus();
  fallbackParserActive = Number(row.melt_active) === 1;
  lastTriggerType = row.melt_reason || null;
  lastTriggeredAt = row.last_melt_at || null;
  lastCheckedAt = row.last_checked_at || null;
  return getMeltPlateStatus();
}

function getMeltPlateStatus() {
  const stats = getHygieneSnapshot();
  const autoPatchRate =
    stats.totalLeads === 0 ? 0 : (stats.autoPatchCount / stats.totalLeads) * 100;
  return {
    fallbackParserActive,
    lastTriggerType,
    lastTriggeredAt,
    lastCheckedAt,
    thresholds: THRESHOLDS,
    stats,
    autoPatchRate: Number(autoPatchRate.toFixed(2)),
  };
}

function isFallbackParserActive() {
  return fallbackParserActive;
}

async function triggerCrmMeltPlate(type, stats) {
  fallbackParserActive = true;
  lastTriggerType = type;
  lastTriggeredAt = new Date();
  console.error(`[CRM-MELT-PLATE] Triggered: ${type}`);

  await pool.query(
    `UPDATE crm_hygiene_stats
     SET melt_active = 1, melt_reason = ?, last_melt_at = NOW(), last_checked_at = NOW()
     WHERE id = 1`,
    [type]
  );
  await pool.query(
    `INSERT INTO crm_melt_plate_events (id, trigger_type, stats) VALUES (?, ?, ?)`,
    [`mpl_${randomUUID().slice(0, 8)}`, type, JSON.stringify(stats)]
  );
}

async function runCrmMeltPlateCheck() {
  const stats = getHygieneSnapshot();
  lastCheckedAt = new Date();
  await pool.query("UPDATE crm_hygiene_stats SET last_checked_at = NOW() WHERE id = 1");

  if (stats.totalLeads === 0) return getMeltPlateStatus();

  const autoPatchRate = (stats.autoPatchCount / stats.totalLeads) * 100;
  if (autoPatchRate > THRESHOLDS.MAX_AUTO_PATCH_RATE_PERCENT) {
    await triggerCrmMeltPlate("AUTO_PATCH_SPIKE", stats);
  }
  if (stats.schemaDriftCount > THRESHOLDS.MAX_SCHEMA_DRIFT_EVENTS) {
    await triggerCrmMeltPlate("SCHEMA_DRIFT_SPIKE", stats);
  }
  if (stats.quarantineCount > THRESHOLDS.MAX_QUARANTINE_EVENTS) {
    await triggerCrmMeltPlate("FATAL_PAYLOAD_SPIKE", stats);
  }
  return getMeltPlateStatus();
}

async function listMeltPlateEvents(limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [rows] = await pool.query(
    `SELECT * FROM crm_melt_plate_events ORDER BY created_at DESC LIMIT ?`,
    [safeLimit]
  );
  return rows.map((row) => ({
    id: row.id,
    triggerType: row.trigger_type,
    stats: parseJson(row.stats),
    createdAt: row.created_at,
  }));
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = {
  THRESHOLDS,
  loadMeltPlateState,
  getMeltPlateStatus,
  isFallbackParserActive,
  runCrmMeltPlateCheck,
  listMeltPlateEvents,
};
