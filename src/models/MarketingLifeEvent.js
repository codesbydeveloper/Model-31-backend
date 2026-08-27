const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    lifeEvent: row.event_type,
    detectedFrom: row.detected_from || null,
    date: row.event_date,
    vehicleNeed: row.vehicle_need || null,
    intent: row.intent || row.priority || "MEDIUM",
    status: row.status,
    notes: row.notes || null,
    customerSignal: row.customer_signal || null,
    leadLabel: row.lead_label || null,
    leadId: row.lead_id || null,
    leadLinked: Boolean(row.lead_label || row.lead_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 8));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.eventType || query.lifeEvent) {
    where.push("e.event_type = ?");
    params.push(query.eventType || query.lifeEvent);
  }
  if (query.status) {
    where.push("e.status = ?");
    params.push(query.status);
  } else if (query.includeDismissed !== "true" && query.includeDismissed !== "1") {
    where.push("e.status <> 'DISMISSED'");
  }
  if (query.intent) {
    where.push("e.intent = ?");
    params.push(query.intent);
  }
  if (query.search) {
    where.push(
      "(e.customer_name LIKE ? OR e.event_type LIKE ? OR e.vehicle_need LIKE ? OR e.detected_from LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_life_events e ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS dealership_name
     FROM marketing_life_events e
     LEFT JOIN dealerships d ON d.id = e.dealership_id
     ${whereSql}
     ORDER BY e.event_date DESC, e.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapRow),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS dealership_name
     FROM marketing_life_events e
     LEFT JOIN dealerships d ON d.id = e.dealership_id
     WHERE e.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function dismiss(id) {
  await pool.query(
    `UPDATE marketing_life_events SET status = 'DISMISSED' WHERE id = ?`,
    [id]
  );
  return findById(id);
}

async function linkLead(id, leadLabel, leadId) {
  await pool.query(
    `UPDATE marketing_life_events
     SET status = 'LEAD CREATED', lead_label = ?, lead_id = ?
     WHERE id = ?`,
    [leadLabel, leadId || null, id]
  );
  return findById(id);
}

async function create(data) {
  const id = data.id || `life_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_life_events
      (id, customer_name, dealership_id, event_type, detected_from, event_date,
       vehicle_need, intent, priority, status, notes, customer_signal, lead_label, lead_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerName,
      data.dealershipId || null,
      data.lifeEvent || data.eventType,
      data.detectedFrom || null,
      data.date || data.eventDate || null,
      data.vehicleNeed || null,
      data.intent || "MEDIUM",
      data.intent || data.priority || "MEDIUM",
      data.status || "NEW",
      data.notes || null,
      data.customerSignal || null,
      data.leadLabel || null,
      data.leadId || null,
    ]
  );
  return findById(id);
}

module.exports = {
  list,
  findById,
  dismiss,
  linkLead,
  create,
};
