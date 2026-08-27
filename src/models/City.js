const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  const primary = row.primary_language || "English";
  const secondary = row.secondary_language || "";
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    country: row.country || "USA",
    primaryLanguage: primary,
    secondaryLanguage: secondary,
    language: secondary ? `${primary} / ${secondary}` : primary,
    regionalTone: row.regional_tone || "Professional",
    inventoryFocus: row.inventory_focus || "",
    financingFocus: row.financing_focus || "Financing",
    status: row.status,
    dealerships: Number(row.dealerships) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `
  SELECT c.*,
    (
      SELECT COUNT(*) FROM dealerships d
      WHERE LOWER(d.city) = LOWER(c.name)
    ) AS dealerships
  FROM cities c
`;

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(`${SELECT_LIST} WHERE c.id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function findByNameAndState(name, state) {
  if (!name || !state) return null;
  const [rows] = await pool.query(
    `${SELECT_LIST} WHERE LOWER(c.name) = LOWER(?) AND LOWER(c.state) = LOWER(?) LIMIT 1`,
    [name, state]
  );
  return mapRow(rows[0]);
}

async function list({ search = "", status = "", page = 1, limit = 10 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push("(c.name LIKE ? OR c.state LIKE ? OR c.inventory_focus LIKE ? OR c.regional_tone LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (status) {
    where.push("c.status = ?");
    params.push(status);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM cities c ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereClause} ORDER BY c.name ASC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    cities: rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function create(data) {
  const id = data.id || `city_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO cities
      (id, name, state, country, primary_language, secondary_language,
       regional_tone, inventory_focus, financing_focus, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.state,
      data.country || "USA",
      data.primaryLanguage || "English",
      data.secondaryLanguage || null,
      data.regionalTone || "Professional",
      data.inventoryFocus || null,
      data.financingFocus || "Financing",
      data.status || "Active",
    ]
  );
  return findById(id);
}

async function update(id, data) {
  await pool.query(
    `UPDATE cities SET
      name = ?,
      state = ?,
      country = ?,
      primary_language = ?,
      secondary_language = ?,
      regional_tone = ?,
      inventory_focus = ?,
      financing_focus = ?,
      status = ?
     WHERE id = ?`,
    [
      data.name,
      data.state,
      data.country || "USA",
      data.primaryLanguage || "English",
      data.secondaryLanguage || null,
      data.regionalTone || "Professional",
      data.inventoryFocus || null,
      data.financingFocus || "Financing",
      data.status || "Active",
      id,
    ]
  );
  return findById(id);
}

async function remove(id) {
  await pool.query(`DELETE FROM cities WHERE id = ?`, [id]);
}

module.exports = {
  findById,
  findByNameAndState,
  list,
  create,
  update,
  remove,
};
