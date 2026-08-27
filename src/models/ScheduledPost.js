const { randomUUID } = require("crypto");
const pool = require("../config/database");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function splitDateTime(value) {
  if (!value) return { date: null, time: null };
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return { date: null, time: null };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function combineDateTime(date, time) {
  const datePart = String(date || "").trim();
  const timePart = String(time || "00:00").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;

  let normalizedTime = timePart.toUpperCase();
  const ampm = normalizedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    const period = ampm[3].toUpperCase();
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    normalizedTime = `${pad2(hours)}:${pad2(minutes)}:00`;
  } else if (/^\d{1,2}:\d{2}$/.test(normalizedTime)) {
    const [h, m] = normalizedTime.split(":");
    normalizedTime = `${pad2(Number(h))}:${pad2(Number(m))}:00`;
  } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(normalizedTime)) {
    const [h, m, s] = normalizedTime.split(":");
    normalizedTime = `${pad2(Number(h))}:${pad2(Number(m))}:${pad2(Number(s))}`;
  } else {
    return null;
  }

  const iso = `${datePart}T${normalizedTime}`;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function mapRow(row) {
  if (!row) return null;
  const { date, time } = splitDateTime(row.scheduled_at);
  const status = String(row.status || "SCHEDULED").toUpperCase();
  const canAct = status === "SCHEDULED";
  return {
    id: row.id,
    title: row.title,
    platform: row.platform,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    contentId: row.content_id || null,
    scheduledAt: row.scheduled_at,
    date,
    time,
    timezone: row.timezone || "America/New_York",
    status,
    canReschedule: canAct,
    canCancel: canAct,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.search) {
    where.push("(sp.title LIKE ? OR d.name LIKE ? OR sp.platform LIKE ?)");
    const q = `%${query.search}%`;
    params.push(q, q, q);
  }
  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("sp.status = ?");
    params.push(String(query.status).toUpperCase());
  }
  if (query.platform && query.platform !== "ALL") {
    where.push("sp.platform = ?");
    params.push(query.platform);
  }
  if (query.dealershipId) {
    where.push("sp.dealership_id = ?");
    params.push(query.dealershipId);
  }
  if (query.from) {
    where.push("sp.scheduled_at >= ?");
    params.push(query.from);
  }
  if (query.to) {
    where.push("sp.scheduled_at <= ?");
    params.push(query.to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM scheduled_posts sp
     LEFT JOIN dealerships d ON d.id = sp.dealership_id
     ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT sp.*, d.name AS dealership_name
     FROM scheduled_posts sp
     LEFT JOIN dealerships d ON d.id = sp.dealership_id
     ${whereSql}
     ORDER BY sp.scheduled_at ASC, sp.title ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total) || 0;
  return {
    items: rows.map(mapRow),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function listForCalendar(query = {}) {
  const where = [];
  const params = [];

  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("sp.status = ?");
    params.push(String(query.status).toUpperCase());
  } else {
    where.push("sp.status = 'SCHEDULED'");
  }
  if (query.platform && query.platform !== "ALL") {
    where.push("sp.platform = ?");
    params.push(query.platform);
  }
  if (query.dealershipId) {
    where.push("sp.dealership_id = ?");
    params.push(query.dealershipId);
  }
  if (query.from) {
    where.push("sp.scheduled_at >= ?");
    params.push(query.from);
  }
  if (query.to) {
    where.push("sp.scheduled_at <= ?");
    params.push(query.to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT sp.*, d.name AS dealership_name
     FROM scheduled_posts sp
     LEFT JOIN dealerships d ON d.id = sp.dealership_id
     ${whereSql}
     ORDER BY sp.scheduled_at ASC, sp.title ASC`,
    params
  );

  const items = rows.map(mapRow);
  const groupsMap = new Map();
  for (const item of items) {
    const key = item.date || "unscheduled";
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(item);
  }

  const groups = Array.from(groupsMap.entries()).map(([date, groupItems]) => ({
    date,
    items: groupItems,
  }));

  return { groups, items };
}

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT sp.*, d.name AS dealership_name
     FROM scheduled_posts sp
     LEFT JOIN dealerships d ON d.id = sp.dealership_id
     WHERE sp.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function create(data) {
  const id = data.id || `sp_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO scheduled_posts
      (id, title, platform, dealership_id, content_id, scheduled_at, timezone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.title,
      data.platform,
      data.dealershipId,
      data.contentId || null,
      data.scheduledAt,
      data.timezone || "America/New_York",
      data.status || "SCHEDULED",
    ]
  );
  return findById(id);
}

async function reschedule(id, { scheduledAt, timezone }) {
  const fields = ["scheduled_at = ?"];
  const params = [scheduledAt];
  if (timezone) {
    fields.push("timezone = ?");
    params.push(timezone);
  }
  params.push(id);
  await pool.query(
    `UPDATE scheduled_posts SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query(`UPDATE scheduled_posts SET status = ? WHERE id = ?`, [
    status,
    id,
  ]);
  return findById(id);
}

module.exports = {
  list,
  listForCalendar,
  findById,
  create,
  reschedule,
  updateStatus,
  combineDateTime,
  mapRow,
};
