const { randomUUID } = require("crypto");
const pool = require("../config/database");
const AppError = require("../utils/AppError");
const {
  catalogRolesFor,
  getCatalogForRole,
  isValidTypeForRole,
  findCatalogItem,
} = require("../utils/roleNotificationCatalog");

const STORE_ROLES = [
  "Dealership Admin",
  "Dealership Manager",
  "Service Manager",
  "Inventory Manager",
];
const OWN_USER_ROLES = ["Salesperson", "Service Advisor"];

function mapRow(row) {
  return {
    id: row.id,
    role: row.role,
    type: row.type,
    title: row.title,
    message: row.message,
    userId: row.user_id || null,
    dealershipId: row.dealership_id || null,
    entityType: row.entity_type || null,
    entityId: row.entity_id || null,
    isRead: Boolean(row.read_at),
    readAt: row.read_at || null,
    createdAt: row.created_at,
  };
}

function visibilitySql(user) {
  const roles = catalogRolesFor(user.role);
  const params = [...roles, user.id];
  let sql = `n.role IN (${roles.map(() => "?").join(",")})
    AND (n.user_id IS NULL OR n.user_id = ?)`;

  if (OWN_USER_ROLES.includes(user.role)) {
    return {
      sql: `n.role = ? AND n.user_id = ?`,
      params: [user.role, user.id],
    };
  }

  if (user.role === "Super Admin") {
    sql += ` AND n.dealership_id IS NULL`;
    return { sql, params };
  }

  if (STORE_ROLES.includes(user.role)) {
    if (!user.dealershipId) {
      return { sql: "1 = 0", params: [] };
    }
    sql += ` AND n.dealership_id = ?`;
    params.push(user.dealershipId);
    return { sql, params };
  }

  if (user.dealershipId) {
    sql += ` AND (n.dealership_id IS NULL OR n.dealership_id = ?)`;
    params.push(user.dealershipId);
  } else {
    sql += ` AND n.dealership_id IS NULL`;
  }
  return { sql, params };
}

async function listNotifications(user, query = {}) {
  const { sql, params } = visibilitySql(user);
  const unreadOnly =
    query.unread === "true" || query.unread === true || query.unread === "1";
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (page - 1) * limit;

  let where = sql;
  const whereParams = [...params];
  if (unreadOnly) {
    where += ` AND r.read_at IS NULL`;
  }

  const [[countRow]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM role_notifications n
     LEFT JOIN role_notification_reads r
       ON r.notification_id = n.id AND r.user_id = ?
     WHERE ${where}`,
    [user.id, ...whereParams]
  );

  const [rows] = await pool.query(
    `SELECT n.*, r.read_at
     FROM role_notifications n
     LEFT JOIN role_notification_reads r
       ON r.notification_id = n.id AND r.user_id = ?
     WHERE ${where}
     ORDER BY n.created_at DESC
     LIMIT ? OFFSET ?`,
    [user.id, ...whereParams, limit, offset]
  );

  return {
    role: user.role,
    notifications: rows.map(mapRow),
    unreadCount: unreadOnly
      ? Number(countRow.total) || 0
      : await countUnread(user),
    pagination: {
      page,
      limit,
      total: Number(countRow.total) || 0,
    },
  };
}

async function countUnread(user) {
  const { sql, params } = visibilitySql(user);
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM role_notifications n
     LEFT JOIN role_notification_reads r
       ON r.notification_id = n.id AND r.user_id = ?
     WHERE ${sql} AND r.read_at IS NULL`,
    [user.id, ...params]
  );
  return Number(row.total) || 0;
}

async function getUnreadCount(user) {
  return { role: user.role, unreadCount: await countUnread(user) };
}

function getCatalog(user) {
  return {
    role: user.role,
    types: getCatalogForRole(user.role).map((item) => ({
      type: item.type,
      title: item.title,
    })),
  };
}

async function assertVisible(user, id) {
  const { sql, params } = visibilitySql(user);
  const [rows] = await pool.query(
    `SELECT n.*, r.read_at
     FROM role_notifications n
     LEFT JOIN role_notification_reads r
       ON r.notification_id = n.id AND r.user_id = ?
     WHERE n.id = ? AND ${sql}
     LIMIT 1`,
    [user.id, id, ...params]
  );
  if (!rows[0]) throw new AppError("Notification not found", 404);
  return mapRow(rows[0]);
}

async function markRead(user, id) {
  await assertVisible(user, id);
  await pool.query(
    `INSERT INTO role_notification_reads (notification_id, user_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)`,
    [id, user.id]
  );
  return { message: "Notification marked as read", notification: await assertVisible(user, id) };
}

async function markAllRead(user) {
  const { sql, params } = visibilitySql(user);
  const [rows] = await pool.query(
    `SELECT n.id
     FROM role_notifications n
     LEFT JOIN role_notification_reads r
       ON r.notification_id = n.id AND r.user_id = ?
     WHERE ${sql} AND r.read_at IS NULL`,
    [user.id, ...params]
  );
  for (const row of rows) {
    await pool.query(
      `INSERT INTO role_notification_reads (notification_id, user_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)`,
      [row.id, user.id]
    );
  }
  return { message: "All notifications marked as read", marked: rows.length };
}

async function createNotification(body = {}) {
  const role = String(body.role || "").trim();
  const type = String(body.type || "").trim();
  if (!role || !getCatalogForRole(role).length) {
    throw new AppError("role is not a notification role", 400);
  }
  if (!isValidTypeForRole(role, type)) {
    throw new AppError("type is not valid for this role", 400);
  }
  const catalog = findCatalogItem(role, type);
  const storedRole = role === "Dealership Manager" ? "Dealership Admin" : role;
  const userId = body.userId || body.user_id || null;
  const dealershipId = body.dealershipId || body.dealership_id || null;
  if (OWN_USER_ROLES.includes(storedRole) && !userId) {
    throw new AppError("userId is required for this role", 400);
  }
  if (STORE_ROLES.includes(storedRole) && !dealershipId) {
    throw new AppError("dealershipId is required for this role", 400);
  }
  const id = `ntf_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO role_notifications
      (id, role, type, title, message, user_id, dealership_id, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      storedRole,
      type,
      body.title || catalog.title,
      body.message || catalog.message,
      userId,
      dealershipId,
      body.entityType || body.entity_type || null,
      body.entityId || body.entity_id || null,
    ]
  );
  const [rows] = await pool.query(`SELECT *, NULL AS read_at FROM role_notifications WHERE id = ?`, [
    id,
  ]);
  return mapRow(rows[0]);
}

module.exports = {
  listNotifications,
  getUnreadCount,
  getCatalog,
  markRead,
  markAllRead,
  createNotification,
};
