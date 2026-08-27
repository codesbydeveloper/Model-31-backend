const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapSignal(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    detectedPhrase: row.detected_phrase || row.signal_type || "",
    category: row.category || row.signal_type || null,
    vehicle: row.vehicle || row.vehicle_interest || null,
    budget: row.budget || null,
    timeline: row.timeline || null,
    intent: row.strength || "MEDIUM",
    detectedAt: row.detected_at,
    leadLabel: row.lead_label || null,
    leadLinked: Boolean(row.lead_linked),
    status: row.status,
    source: row.source || null,
    createdAt: row.created_at,
  };
}

function mapKeyword(row) {
  return {
    id: row.id,
    keyword: row.keyword,
    category: row.category,
    occurrences: Number(row.occurrences) || 0,
    customers: Number(row.customers) || 0,
    intent: row.intent,
    lastDetected: row.last_detected,
  };
}

function mapBudget(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    budgetSignal: row.budget_signal,
    payment:
      row.payment !== null && row.payment !== undefined
        ? Number(row.payment)
        : null,
    financing: row.financing || null,
    vehicle: row.vehicle || null,
    intent: row.intent,
    date: row.signal_date,
    leadLabel: row.lead_label || null,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.intent || query.strength) {
    where.push("s.strength = ?");
    params.push(query.intent || query.strength);
  }
  if (query.category) {
    where.push("s.category = ?");
    params.push(query.category);
  }
  if (query.search) {
    where.push(
      "(s.customer_name LIKE ? OR s.detected_phrase LIKE ? OR s.signal_type LIKE ? OR s.vehicle LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_intent_signals s ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT s.*, d.name AS dealership_name
     FROM marketing_intent_signals s
     LEFT JOIN dealerships d ON d.id = s.dealership_id
     ${whereSql}
     ORDER BY s.detected_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapSignal),
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
    `SELECT s.*, d.name AS dealership_name
     FROM marketing_intent_signals s
     LEFT JOIN dealerships d ON d.id = s.dealership_id
     WHERE s.id = ? LIMIT 1`,
    [id]
  );
  return mapSignal(rows[0]);
}

async function listKeywords(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 6));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.category) {
    where.push("category = ?");
    params.push(query.category);
  }
  if (query.intent) {
    where.push("intent = ?");
    params.push(query.intent);
  }
  if (query.search) {
    where.push("keyword LIKE ?");
    params.push(`%${query.search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM intent_keywords ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT * FROM intent_keywords ${whereSql}
     ORDER BY occurrences DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapKeyword),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function listBudgetSignals(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 6));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.intent) {
    where.push("b.intent = ?");
    params.push(query.intent);
  }
  if (query.search) {
    where.push(
      "(b.customer_name LIKE ? OR b.budget_signal LIKE ? OR b.vehicle LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM budget_signals b ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT b.*, d.name AS dealership_name
     FROM budget_signals b
     LEFT JOIN dealerships d ON d.id = b.dealership_id
     ${whereSql}
     ORDER BY b.signal_date DESC, b.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapBudget),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function findBudgetById(id) {
  const [rows] = await pool.query(
    `SELECT b.*, d.name AS dealership_name
     FROM budget_signals b
     LEFT JOIN dealerships d ON d.id = b.dealership_id
     WHERE b.id = ? LIMIT 1`,
    [id]
  );
  return mapBudget(rows[0]);
}

async function linkLead(id, leadLabel) {
  await pool.query(
    `UPDATE marketing_intent_signals
     SET lead_label = ?, lead_linked = 1, status = 'LINKED'
     WHERE id = ?`,
    [leadLabel, id]
  );
  return findById(id);
}

async function linkBudgetLead(id, leadLabel) {
  await pool.query(
    `UPDATE budget_signals SET lead_label = ? WHERE id = ?`,
    [leadLabel, id]
  );
  return findBudgetById(id);
}

async function getStats() {
  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN strength = 'HIGH' THEN 1 ELSE 0 END) AS high,
      SUM(CASE WHEN strength = 'MEDIUM' THEN 1 ELSE 0 END) AS medium,
      SUM(CASE WHEN strength = 'LOW' THEN 1 ELSE 0 END) AS low,
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS newSignals
     FROM marketing_intent_signals`
  );
  return {
    total: Number(rows[0].total) || 0,
    high: Number(rows[0].high) || 0,
    medium: Number(rows[0].medium) || 0,
    low: Number(rows[0].low) || 0,
    newSignals: Number(rows[0].newSignals) || 0,
  };
}

async function create(data) {
  const id = data.id || `int_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_intent_signals
      (id, customer_name, dealership_id, signal_type, detected_phrase, category,
       vehicle, budget, timeline, strength, vehicle_interest, source, status,
       lead_label, lead_linked)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerName,
      data.dealershipId || null,
      data.category || data.signalType || "GENERAL",
      data.detectedPhrase || "",
      data.category || null,
      data.vehicle || null,
      data.budget || null,
      data.timeline || null,
      data.intent || data.strength || "MEDIUM",
      data.vehicle || null,
      data.source || null,
      data.status || "NEW",
      data.leadLabel || null,
      data.leadLinked ? 1 : 0,
    ]
  );
  return findById(id);
}

module.exports = {
  list,
  findById,
  listKeywords,
  listBudgetSignals,
  findBudgetById,
  linkLead,
  linkBudgetLead,
  getStats,
  create,
};
