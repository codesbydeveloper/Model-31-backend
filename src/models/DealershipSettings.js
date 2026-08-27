const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    dealershipId: row.dealership_id,
    leadAlerts: Boolean(row.lead_alerts),
    crmAutoSync: Boolean(row.crm_auto_sync),
    appointmentReminders: Boolean(row.appointment_reminders),
    afterHoursRouting: Boolean(row.after_hours_routing),
    updatedAt: row.updated_at,
  };
}

async function findByDealership(dealershipId) {
  const [rows] = await pool.query(
    `SELECT * FROM dealership_settings WHERE dealership_id = ? LIMIT 1`,
    [dealershipId]
  );
  return mapRow(rows[0]);
}

async function ensureDefault(dealershipId) {
  const existing = await findByDealership(dealershipId);
  if (existing) return existing;
  await pool.query(
    `INSERT INTO dealership_settings (dealership_id) VALUES (?)`,
    [dealershipId]
  );
  return findByDealership(dealershipId);
}

async function save(dealershipId, data) {
  await ensureDefault(dealershipId);
  await pool.query(
    `UPDATE dealership_settings SET
      lead_alerts = ?,
      crm_auto_sync = ?,
      appointment_reminders = ?,
      after_hours_routing = ?
     WHERE dealership_id = ?`,
    [
      data.leadAlerts ? 1 : 0,
      data.crmAutoSync ? 1 : 0,
      data.appointmentReminders ? 1 : 0,
      data.afterHoursRouting ? 1 : 0,
      dealershipId,
    ]
  );
  return findByDealership(dealershipId);
}

module.exports = { findByDealership, ensureDefault, save };
