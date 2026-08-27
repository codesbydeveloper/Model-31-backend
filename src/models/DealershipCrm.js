const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    dealershipId: row.dealership_id,
    provider: row.provider,
    status: row.status,
    crmMode: row.crm_mode,
    pipeline: row.pipeline,
    sourceLabel: row.source_label,
    leadsSynced: Number(row.leads_synced) || 0,
    customersSynced: Number(row.customers_synced) || 0,
    appointmentsSynced: Number(row.appointments_synced) || 0,
    soldDealsSynced: Number(row.sold_deals_synced) || 0,
    syncErrors: Number(row.sync_errors) || 0,
    lastSync: row.last_sync,
  };
}

async function findByDealership(dealershipId) {
  const [rows] = await pool.query(
    `SELECT * FROM dealership_crm WHERE dealership_id = ? LIMIT 1`,
    [dealershipId]
  );
  return mapRow(rows[0]);
}

async function ensureDefault(dealershipId) {
  const existing = await findByDealership(dealershipId);
  if (existing) return existing;
  await pool.query(
    `INSERT INTO dealership_crm (dealership_id, last_sync)
     VALUES (?, NOW())`,
    [dealershipId]
  );
  return findByDealership(dealershipId);
}

async function syncNow(dealershipId) {
  await ensureDefault(dealershipId);
  await pool.query(
    `UPDATE dealership_crm SET last_sync = NOW() WHERE dealership_id = ?`,
    [dealershipId]
  );
  return findByDealership(dealershipId);
}

module.exports = { findByDealership, ensureDefault, syncNow };
