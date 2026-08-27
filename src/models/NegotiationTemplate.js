const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  const minPriceRule = row.min_price_rule || "";
  const maxDiscountRule = row.max_discount_rule || "";
  const priceRules = [minPriceRule, maxDiscountRule].filter(Boolean).join(" / ") || "";

  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    vehicleType: row.vehicle_type || "New",
    status: row.status,
    minPriceRule,
    maxDiscountRule,
    priceRules,
    paymentRange: row.payment_range || "",
    tradeRange: row.trade_range || "",
    allowedIncentives: row.allowed_incentives || "",
    allowedFees: row.allowed_fees || "",
    vehicleCount: Number(row.vehicle_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `SELECT * FROM negotiation_templates`;

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

async function list({ search = "", status = "", page = 1, limit = 10 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push(
      `(name LIKE ? OR description LIKE ? OR vehicle_type LIKE ? OR payment_range LIKE ? OR trade_range LIKE ?)`
    );
    const like = `%${search}%`;
    params.push(like, like, like, like, like);
  }
  if (status) {
    where.push("status = ?");
    params.push(String(status).toUpperCase());
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM negotiation_templates ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    templates: rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function create(data) {
  const id = data.id || `ntpl_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO negotiation_templates
      (id, name, description, vehicle_type, status, min_price_rule, max_discount_rule,
       payment_range, trade_range, allowed_incentives, allowed_fees, vehicle_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description || null,
      data.vehicleType || "New",
      data.status || "ACTIVE",
      data.minPriceRule || null,
      data.maxDiscountRule || null,
      data.paymentRange || null,
      data.tradeRange || null,
      data.allowedIncentives || null,
      data.allowedFees || null,
      data.vehicleCount ?? 0,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  await pool.query(
    `UPDATE negotiation_templates SET
      name = ?,
      description = ?,
      vehicle_type = ?,
      status = ?,
      min_price_rule = ?,
      max_discount_rule = ?,
      payment_range = ?,
      trade_range = ?,
      allowed_incentives = ?,
      allowed_fees = ?,
      vehicle_count = ?
     WHERE id = ?`,
    [
      data.name,
      data.description || null,
      data.vehicleType || "New",
      data.status || "ACTIVE",
      data.minPriceRule || null,
      data.maxDiscountRule || null,
      data.paymentRange || null,
      data.tradeRange || null,
      data.allowedIncentives || null,
      data.allowedFees || null,
      data.vehicleCount ?? 0,
      id,
    ]
  );
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query(`UPDATE negotiation_templates SET status = ? WHERE id = ?`, [
    status,
    id,
  ]);
  return findById(id);
}

async function remove(id) {
  await pool.query(`DELETE FROM negotiation_templates WHERE id = ?`, [id]);
}

module.exports = {
  findById,
  findByName,
  list,
  create,
  update,
  updateStatus,
  remove,
};
