const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.lead_id || null,
    salespersonId: row.salesperson_id,
    dealershipId: row.dealership_id || null,
    dealership: row.dealership_name || null,
    customerName: row.customer_name,
    vehicle: row.vehicle || "",
    appointmentType: row.appointment_type,
    date: row.appointment_date,
    time: row.appointment_time,
    status: row.status,
    notes: row.notes || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `
  SELECT a.*, d.name AS dealership_name
  FROM appointments a
  LEFT JOIN dealerships d ON d.id = a.dealership_id
`;

async function findById(id) {
  const [rows] = await pool.query(`${SELECT_LIST} WHERE a.id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function listBySalesperson(
  salespersonId,
  { search = "", status = "", page = 1, limit = 10 } = {}
) {
  const where = ["a.salesperson_id = ?"];
  const params = [salespersonId];

  if (status) {
    where.push("a.status = ?");
    params.push(status);
  }
  if (search) {
    where.push(
      `(a.customer_name LIKE ? OR a.vehicle LIKE ? OR a.lead_id LIKE ?)`
    );
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM appointments a ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereClause}
     ORDER BY a.appointment_date ASC, a.appointment_time ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    appointments: rows.map(mapRow),
    pagination: { page: safePage, limit: safeLimit, total, totalPages },
  };
}

async function getStats(salespersonId) {
  const today = new Date().toISOString().slice(0, 10);
  const [rows] = await pool.query(
    `SELECT
      SUM(CASE WHEN appointment_date = ? THEN 1 ELSE 0 END) AS today_count,
      SUM(CASE WHEN appointment_date >= ? AND status IN ('SCHEDULED','CONFIRMED') THEN 1 ELSE 0 END) AS upcoming,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'NO SHOW' THEN 1 ELSE 0 END) AS no_show,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled
     FROM appointments
     WHERE salesperson_id = ?`,
    [today, today, salespersonId]
  );
  const row = rows[0] || {};
  return {
    today: Number(row.today_count) || 0,
    upcoming: Number(row.upcoming) || 0,
    confirmed: Number(row.confirmed) || 0,
    completed: Number(row.completed) || 0,
    noShow: Number(row.no_show) || 0,
    cancelled: Number(row.cancelled) || 0,
  };
}

async function create(data) {
  const id = data.id || `appt_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO appointments
      (id, lead_id, salesperson_id, dealership_id, customer_name, vehicle,
       appointment_type, appointment_date, appointment_time, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.leadId || null,
      data.salespersonId,
      data.dealershipId || null,
      data.customerName,
      data.vehicle || null,
      data.appointmentType || "Test Drive",
      data.date,
      data.time,
      data.status || "SCHEDULED",
      data.notes || null,
    ]
  );
  return findById(id);
}

module.exports = { findById, listBySalesperson, getStats, create };
