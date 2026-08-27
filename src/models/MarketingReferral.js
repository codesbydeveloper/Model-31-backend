const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapReferral(row) {
  if (!row) return null;
  return {
    id: row.id,
    referrerName: row.referrer_name,
    referredPerson: row.referred_name || null,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    source: row.source || null,
    status: row.status,
    reward: row.reward || null,
    message: row.message || null,
    leadLabel: row.lead_label || null,
    appointmentId: row.appointment_id || null,
    sale: row.sale || null,
    eligibleId: row.eligible_id || null,
    date: row.requested_at || row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEligible(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.status) {
    where.push("r.status = ?");
    params.push(query.status);
  }
  if (query.search) {
    where.push(
      "(r.referrer_name LIKE ? OR r.referred_name LIKE ? OR r.source LIKE ? OR r.lead_label LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_referrals r ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT r.*, d.name AS dealership_name
     FROM marketing_referrals r
     LEFT JOIN dealerships d ON d.id = r.dealership_id
     ${whereSql}
     ORDER BY COALESCE(r.requested_at, r.created_at) DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapReferral),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function listEligible(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  const where = ["e.status = 'Eligible'"];
  const params = [];

  if (query.search) {
    where.push("e.customer_name LIKE ?");
    params.push(`%${query.search}%`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM referral_eligible_customers e ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS dealership_name
     FROM referral_eligible_customers e
     LEFT JOIN dealerships d ON d.id = e.dealership_id
     ${whereSql}
     ORDER BY e.customer_name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapEligible),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function findEligibleById(id) {
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS dealership_name
     FROM referral_eligible_customers e
     LEFT JOIN dealerships d ON d.id = e.dealership_id
     WHERE e.id = ? LIMIT 1`,
    [id]
  );
  return mapEligible(rows[0]);
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT r.*, d.name AS dealership_name
     FROM marketing_referrals r
     LEFT JOIN dealerships d ON d.id = r.dealership_id
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return mapReferral(rows[0]);
}

async function askReferral(data) {
  const id = data.id || `ref_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_referrals
      (id, referrer_name, referred_name, dealership_id, source, status, reward,
       message, lead_label, appointment_id, sale, eligible_id, requested_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.referrerName,
      data.referredPerson || "Pending",
      data.dealershipId || null,
      data.source || "Ask for Referral",
      "REQUESTED",
      data.reward || null,
      data.message || "Do you know someone who may be looking for a vehicle?",
      null,
      null,
      null,
      data.eligibleId || null,
      new Date(),
    ]
  );

  if (data.eligibleId) {
    await pool.query(
      `UPDATE referral_eligible_customers SET status = 'Requested' WHERE id = ?`,
      [data.eligibleId]
    );
  }

  return findById(id);
}

async function createEligible(data) {
  const id = data.id || `rel_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO referral_eligible_customers
      (id, customer_name, dealership_id, status)
     VALUES (?, ?, ?, ?)`,
    [id, data.customerName, data.dealershipId || null, data.status || "Eligible"]
  );
  return findEligibleById(id);
}

async function getStats() {
  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS requests,
      SUM(CASE WHEN status IN ('RECEIVED','QUALIFYING','QUALIFIED','APPOINTMENT','SOLD','REQUESTED') AND referred_name IS NOT NULL AND referred_name <> 'Pending' THEN 1 ELSE 0 END) AS referralLeads,
      SUM(CASE WHEN status = 'QUALIFIED' THEN 1 ELSE 0 END) AS qualified,
      SUM(CASE WHEN status = 'APPOINTMENT' THEN 1 ELSE 0 END) AS appointments,
      SUM(CASE WHEN status = 'SOLD' THEN 1 ELSE 0 END) AS sold,
      SUM(CASE WHEN status = 'REQUESTED' THEN 1 ELSE 0 END) AS requestedCount
     FROM marketing_referrals`
  );
  return {
    requests: Number(rows[0].requests) || 0,
    referralLeads: Number(rows[0].referralLeads) || 0,
    qualified: Number(rows[0].qualified) || 0,
    appointments: Number(rows[0].appointments) || 0,
    sold: Number(rows[0].sold) || 0,
  };
}

module.exports = {
  list,
  listEligible,
  findEligibleById,
  findById,
  askReferral,
  createEligible,
  getStats,
};
