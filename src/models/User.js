const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    dealershipId: row.dealership_id || null,
    dealershipName: row.dealership_name || null,
    phone: row.phone || null,
    status: row.status,
    presence: row.presence || "OFFLINE",
    salespersonId: row.salesperson_id || null,
    lastActive: row.last_active || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

const SELECT_WITH_DEALERSHIP = `
  SELECT u.*, d.name AS dealership_name
  FROM users u
  LEFT JOIN dealerships d ON d.id = u.dealership_id
`;

async function findByEmail(email) {
  const [rows] = await pool.query(
    `${SELECT_WITH_DEALERSHIP} WHERE u.email = ? LIMIT 1`,
    [email]
  );
  return mapUser(rows[0]);
}

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `${SELECT_WITH_DEALERSHIP} WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return mapUser(rows[0]);
}

async function list({ search = "", role = "", status = "", page = 1, limit = 10 } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (role) {
    where.push("u.role = ?");
    params.push(role);
  }
  if (status) {
    where.push("u.status = ?");
    params.push(status);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users u ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_WITH_DEALERSHIP} ${whereClause} ORDER BY u.name ASC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    users: rows.map(mapUser),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function create({
  id,
  name,
  email,
  password,
  role,
  dealershipId,
  phone,
  status,
  salespersonId,
}) {
  const userId = id || `usr_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO users
      (id, name, email, password, role, dealership_id, phone, status, salesperson_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      name,
      email,
      password,
      role,
      dealershipId || null,
      phone || null,
      status || "Active",
      salespersonId || null,
    ]
  );
  return findById(userId);
}

async function update(id, data) {
  await pool.query(
    `UPDATE users SET
      name = ?,
      email = ?,
      role = ?,
      dealership_id = ?,
      phone = ?,
      status = ?,
      salesperson_id = ?
     WHERE id = ?`,
    [
      data.name,
      data.email,
      data.role,
      data.dealershipId || null,
      data.phone || null,
      data.status || "Active",
      data.salespersonId || null,
      id,
    ]
  );
  return findById(id);
}

async function updatePassword(id, passwordHash) {
  await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [passwordHash, id]);
  return findById(id);
}

async function touchLastActive(id) {
  await pool.query(`UPDATE users SET last_active = NOW() WHERE id = ?`, [id]);
}

async function updatePresence(id, presence) {
  await pool.query(`UPDATE users SET presence = ? WHERE id = ?`, [presence, id]);
  return findById(id);
}

async function remove(id) {
  await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
}

async function listSalespeopleByDealership(dealershipId, { page = 1, limit = 10 } = {}) {
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users
     WHERE dealership_id = ? AND role = 'Salesperson'`,
    [dealershipId]
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_WITH_DEALERSHIP}
     WHERE u.dealership_id = ? AND u.role = 'Salesperson'
     ORDER BY u.name ASC
     LIMIT ? OFFSET ?`,
    [dealershipId, safeLimit, offset]
  );

  return {
    users: rows.map(mapUser),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

module.exports = {
  findByEmail,
  findById,
  list,
  listSalespeopleByDealership,
  create,
  update,
  updatePassword,
  touchLastActive,
  updatePresence,
  remove,
};
