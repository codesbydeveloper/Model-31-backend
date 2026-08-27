const { randomUUID } = require("crypto");
const pool = require("../config/database");

function formatMoney(value) {
  const num = Number(value) || 0;
  return `US$${num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function mapRow(row) {
  if (!row) return null;
  const minBudget = Number(row.min_budget) || 0;
  const maxBudget = Number(row.max_budget) || 0;
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    minBudget,
    maxBudget,
    budgetRange: `${formatMoney(minBudget)} - ${formatMoney(maxBudget)}`,
    vehiclePreference: row.vehicle_preference || "",
    buyingTimeline: row.buying_timeline || "",
    financingPreference: row.financing_preference || "",
    language: row.language || "English",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `SELECT * FROM buyer_personas`;

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(`${SELECT_LIST} WHERE id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function findByName(name) {
  if (!name) return null;
  const [rows] = await pool.query(
    `${SELECT_LIST} WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name]
  );
  return mapRow(rows[0]);
}

async function list({ search = "", page = 1, limit = 10 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push(
      `(name LIKE ? OR description LIKE ? OR vehicle_preference LIKE ? OR financing_preference LIKE ? OR language LIKE ?)`
    );
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM buyer_personas ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    personas: rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function create(data) {
  const id = data.id || `persona_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO buyer_personas
      (id, name, description, min_budget, max_budget, vehicle_preference,
       buying_timeline, financing_preference, language, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description || null,
      data.minBudget ?? 0,
      data.maxBudget ?? 0,
      data.vehiclePreference || null,
      data.buyingTimeline || null,
      data.financingPreference || null,
      data.language || "English",
      data.status || "Active",
    ]
  );
  return findById(id);
}

async function update(id, data) {
  await pool.query(
    `UPDATE buyer_personas SET
      name = ?,
      description = ?,
      min_budget = ?,
      max_budget = ?,
      vehicle_preference = ?,
      buying_timeline = ?,
      financing_preference = ?,
      language = ?,
      status = ?
     WHERE id = ?`,
    [
      data.name,
      data.description || null,
      data.minBudget ?? 0,
      data.maxBudget ?? 0,
      data.vehiclePreference || null,
      data.buyingTimeline || null,
      data.financingPreference || null,
      data.language || "English",
      data.status || "Active",
      id,
    ]
  );
  return findById(id);
}

async function remove(id) {
  await pool.query(`DELETE FROM buyer_personas WHERE id = ?`, [id]);
}

module.exports = {
  findById,
  findByName,
  list,
  create,
  update,
  remove,
};
