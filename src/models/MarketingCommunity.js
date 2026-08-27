const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    platform: row.platform || "",
    location: row.location || "",
    audience: Number(row.audience ?? row.members) || 0,
    engagement: Number(row.engagement) || 0,
    leads: Number(row.leads_count) || 0,
    qualified: Number(row.qualified_count) || 0,
    appointments: Number(row.appointments) || 0,
    status: row.status || "ACTIVE",
    lastActivity: row.last_activity || null,
    description: row.description || "",
    dealershipId: row.dealership_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    communityId: row.community_id,
    activityType: row.activity_type,
    detail: row.detail || "",
    createdAt: row.created_at,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 8));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("status = ?");
    params.push(String(query.status).toUpperCase());
  }

  if (query.search) {
    where.push(
      "(name LIKE ? OR platform LIKE ? OR location LIKE ? OR description LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_communities ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT * FROM marketing_communities
     ${whereSql}
     ORDER BY COALESCE(last_activity, created_at) DESC, name ASC
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

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT * FROM marketing_communities WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function listActivities(communityId) {
  const [rows] = await pool.query(
    `SELECT * FROM marketing_community_activities
     WHERE community_id = ?
     ORDER BY created_at DESC`,
    [communityId]
  );
  return rows.map(mapActivity);
}

async function create(data) {
  const id = data.id || `com_${randomUUID().slice(0, 8)}`;
  const audience = Number(data.audience) || 0;
  await pool.query(
    `INSERT INTO marketing_communities
      (id, name, platform, location, audience, members, engagement, leads_count,
       qualified_count, appointments, status, last_activity, description, dealership_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.platform || null,
      data.location || null,
      audience,
      audience,
      Number(data.engagement) || 0,
      Number(data.leads) || 0,
      Number(data.qualified) || 0,
      Number(data.appointments) || 0,
      (data.status || "ACTIVE").toUpperCase(),
      data.lastActivity || null,
      data.description || null,
      data.dealershipId || null,
    ]
  );
  return findById(id);
}

async function addActivity(communityId, activityType, detail, createdAt) {
  const id = `cact_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_community_activities
      (id, community_id, activity_type, detail, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, communityId, activityType, detail || "", createdAt || new Date()]
  );
  return id;
}

module.exports = {
  list,
  findById,
  listActivities,
  create,
  addActivity,
};
