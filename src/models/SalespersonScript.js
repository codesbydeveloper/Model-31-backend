const { randomUUID } = require("crypto");
const pool = require("../config/database");

const SCRIPT_STATUSES = ["PENDING", "APPROVED", "EDITED"];
const SCRIPT_PLATFORMS = ["Instagram", "Facebook", "TikTok"];

function toIso(value) {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function mapRow(row) {
  if (!row) return null;
  const status = String(row.status || "PENDING").toUpperCase();
  return {
    id: row.id,
    token: row.token,
    leadId: row.lead_id,
    salespersonId: row.salesperson_id || null,
    customerName: row.customer_name,
    vehicle: row.vehicle || "",
    dealership: row.dealership || null,
    platform: row.platform,
    script: row.script || "",
    caption: row.caption || "",
    cta: row.cta || "",
    status,
    createdAt: toIso(row.created_at),
    approvedAt: toIso(row.approved_at),
    copyEnabled: status === "APPROVED" || status === "EDITED",
  };
}

const SELECT_LIST = `
  SELECT s.*
  FROM salesperson_scripts s
`;

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(`${SELECT_LIST} WHERE s.id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function findByToken(token) {
  if (!token) return null;
  const [rows] = await pool.query(`${SELECT_LIST} WHERE s.token = ? LIMIT 1`, [
    token,
  ]);
  return mapRow(rows[0]);
}

async function findLatestByLead(leadId, salespersonId) {
  if (!leadId) return null;
  const params = [leadId];
  let sql = `${SELECT_LIST} WHERE s.lead_id = ?`;
  if (salespersonId) {
    sql += " AND s.salesperson_id = ?";
    params.push(salespersonId);
  }
  sql += " ORDER BY s.created_at DESC LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return mapRow(rows[0]);
}

async function list({
  salespersonId,
  status = "",
  leadId = "",
  page = 1,
  limit = 10,
} = {}) {
  const where = [];
  const params = [];

  if (salespersonId) {
    where.push("s.salesperson_id = ?");
    params.push(salespersonId);
  }
  if (leadId) {
    where.push("s.lead_id = ?");
    params.push(leadId);
  }
  if (status && String(status).toUpperCase() !== "ALL") {
    where.push("s.status = ?");
    params.push(String(status).toUpperCase());
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM salesperson_scripts s ${whereSql}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereSql}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    scripts: rows.map(mapRow),
    pagination: { page: safePage, limit: safeLimit, total, totalPages },
  };
}

async function countByStatus(salespersonId, status) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM salesperson_scripts
     WHERE salesperson_id = ? AND status = ?`,
    [salespersonId, status]
  );
  return Number(rows[0]?.total) || 0;
}

async function create(data) {
  const id = data.id || `script_${randomUUID().slice(0, 8)}`;
  const token = data.token || `apr_${id}`;
  await pool.query(
    `INSERT INTO salesperson_scripts
      (id, token, lead_id, salesperson_id, marketing_content_id, customer_name,
       vehicle, dealership, platform, script, caption, cta, status, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      token,
      data.leadId || null,
      data.salespersonId || null,
      data.marketingContentId || null,
      data.customerName,
      data.vehicle || "",
      data.dealership || null,
      data.platform,
      data.script,
      data.caption,
      data.cta || null,
      data.status || "PENDING",
      data.approvedAt || null,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const map = {
    script: "script",
    caption: "caption",
    cta: "cta",
    status: "status",
    approvedAt: "approved_at",
    salespersonId: "salesperson_id",
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      fields.push(`${column} = ?`);
      params.push(data[key]);
    }
  }

  if (!fields.length) return findById(id);

  params.push(id);
  await pool.query(
    `UPDATE salesperson_scripts SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return findById(id);
}

module.exports = {
  SCRIPT_STATUSES,
  SCRIPT_PLATFORMS,
  mapRow,
  findById,
  findByToken,
  findLatestByLead,
  list,
  countByStatus,
  create,
  update,
};
