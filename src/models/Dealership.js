const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    zipCode: row.zip_code || "",
    phone: row.phone || "",
    website: row.website || "",
    brands: row.brands
      ? String(row.brands)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    timezone: row.timezone || "America/New_York",
    status: row.status,
    crmStatus: row.crm_status || "Disconnected",
    socialStatus: row.social_status || "Disconnected",
    salespeople: Number(row.salespeople) || 0,
    activeLeads: Number(row.active_leads) || 0,
  };
}

function brandsToString(brands) {
  if (Array.isArray(brands)) {
    return brands.map((item) => String(item).trim()).filter(Boolean).join(", ");
  }
  if (!brands) return "";
  return String(brands).trim();
}

const SELECT_LIST = `
  SELECT d.*,
    (
      SELECT COUNT(*) FROM users u
      WHERE u.dealership_id = d.id AND u.role = 'Salesperson'
    ) AS salespeople
  FROM dealerships d
`;

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(`${SELECT_LIST} WHERE d.id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function findByName(name) {
  const [rows] = await pool.query(`${SELECT_LIST} WHERE d.name = ? LIMIT 1`, [name]);
  return mapRow(rows[0]);
}

async function list({ search, status, city, crmStatus, socialStatus, page = 1, limit = 10 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push("(d.name LIKE ? OR d.city LIKE ? OR d.address LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status) {
    where.push("d.status = ?");
    params.push(status);
  }
  if (city) {
    where.push("d.city = ?");
    params.push(city);
  }
  if (crmStatus) {
    where.push("d.crm_status = ?");
    params.push(crmStatus);
  }
  if (socialStatus) {
    where.push("d.social_status = ?");
    params.push(socialStatus);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM dealerships d ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const sql = `${SELECT_LIST} ${whereClause} ORDER BY d.name ASC LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(sql, [...params, safeLimit, offset]);

  return {
    dealerships: rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function listAllOptions() {
  const [rows] = await pool.query(
    `SELECT id, name, status FROM dealerships ORDER BY name ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
  }));
}

async function create(data) {
  const id = data.id || `dlr_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO dealerships
      (id, name, address, city, state, zip_code, phone, website, brands, timezone, status, crm_status, social_status, active_leads)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.address || null,
      data.city || null,
      data.state || null,
      data.zipCode || null,
      data.phone || null,
      data.website || null,
      brandsToString(data.brands) || null,
      data.timezone || "America/New_York",
      data.status || "Active",
      data.crmStatus || "Disconnected",
      data.socialStatus || "Disconnected",
      data.activeLeads || 0,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  await pool.query(
    `UPDATE dealerships SET
      name = ?,
      address = ?,
      city = ?,
      state = ?,
      zip_code = ?,
      phone = ?,
      website = ?,
      brands = ?,
      timezone = ?,
      status = ?,
      crm_status = ?,
      social_status = ?
     WHERE id = ?`,
    [
      data.name,
      data.address || null,
      data.city || null,
      data.state || null,
      data.zipCode || null,
      data.phone || null,
      data.website || null,
      brandsToString(data.brands) || null,
      data.timezone || "America/New_York",
      data.status || "Active",
      data.crmStatus || "Disconnected",
      data.socialStatus || "Disconnected",
      id,
    ]
  );
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query("UPDATE dealerships SET status = ? WHERE id = ?", [status, id]);
  return findById(id);
}

async function findOrCreateByName(name) {
  const existing = await findByName(name);
  if (existing) return existing;
  return create({ name });
}

module.exports = {
  findById,
  findByName,
  list,
  listAllOptions,
  create,
  update,
  updateStatus,
  findOrCreateByName,
};
