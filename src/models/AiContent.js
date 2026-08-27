const { randomUUID } = require("crypto");
const pool = require("../config/database");

function parseScenes(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    title: row.title,
    contentType: row.content_type || null,
    body: row.body || "",
    hashtags: row.hashtags || "",
    campaignId: row.campaign_id || null,
    campaignName: row.campaign_name || null,
    createdBy: row.created_by || null,
    createdByUserId: row.created_by_user_id || null,
    scheduledAt: row.scheduled_at || null,
    timezone: row.timezone || null,
    reach: Number(row.reach) || 0,
    impressions: Number(row.impressions) || 0,
    engagement: Number(row.engagement) || 0,
    clicks: Number(row.clicks) || 0,
    leadsCount: Number(row.leads_count) || 0,
    appointmentsCount: Number(row.appointments_count) || 0,
    rejectionReason: row.rejection_reason || null,
    vehicle: row.vehicle || "",
    offer: row.offer || "",
    tone: row.tone || null,
    language: row.language || null,
    targetAudience: row.target_audience || null,
    brief: row.brief || "",
    scenes: parseScenes(row.scenes),
    platform: row.platform,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListItem(content) {
  if (!content) return null;
  return {
    id: content.id,
    title: content.title,
    contentType: content.contentType,
    dealershipId: content.dealershipId,
    dealershipName: content.dealershipName,
    platform: content.platform,
    status: content.status,
    createdBy: content.createdBy,
    createdAt: content.createdAt,
    scheduledAt: content.scheduledAt,
    reach: content.reach,
    impressions: content.impressions,
    engagement: content.engagement,
    clicks: content.clicks,
    leads: content.leadsCount,
    appointments: content.appointmentsCount,
  };
}

function mapActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    contentId: row.content_id,
    activityType: row.activity_type,
    actor: row.actor || null,
    detail: row.detail || "",
    createdAt: row.created_at,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.search) {
    where.push(
      "(c.title LIKE ? OR c.body LIKE ? OR c.vehicle LIKE ? OR c.campaign_name LIKE ? OR c.created_by LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q, q);
  }
  if (query.contentType && query.contentType !== "ALL") {
    where.push("c.content_type = ?");
    params.push(query.contentType);
  }
  if (query.dealershipId) {
    where.push("c.dealership_id = ?");
    params.push(query.dealershipId);
  }
  if (query.platform && query.platform !== "ALL") {
    where.push("c.platform = ?");
    params.push(query.platform);
  }
  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("c.status = ?");
    params.push(String(query.status).toUpperCase());
  }
  if (query.campaignId) {
    where.push("c.campaign_id = ?");
    params.push(query.campaignId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM ai_content c ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS dealership_name
     FROM ai_content c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     ${whereSql}
     ORDER BY c.created_at DESC, c.title ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total) || 0;
  return {
    items: rows.map((row) => mapListItem(mapRow(row))),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

async function listByDealership(dealershipId) {
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS dealership_name
     FROM ai_content c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     WHERE c.dealership_id = ?
     ORDER BY c.updated_at DESC`,
    [dealershipId]
  );
  return rows.map(mapRow);
}

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS dealership_name
     FROM ai_content c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function listActivities(contentId) {
  const [rows] = await pool.query(
    `SELECT * FROM ai_content_activities
     WHERE content_id = ?
     ORDER BY created_at ASC`,
    [contentId]
  );
  return rows.map(mapActivity);
}

async function addActivity(contentId, activityType, actor, detail, createdAt) {
  const id = `aca_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO ai_content_activities
      (id, content_id, activity_type, actor, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      contentId,
      activityType,
      actor || null,
      detail || "",
      createdAt || new Date(),
    ]
  );
  return id;
}

async function create(data) {
  const id = data.id || `mc_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO ai_content
      (id, dealership_id, title, content_type, body, hashtags, campaign_id, campaign_name,
       created_by, created_by_user_id, scheduled_at, timezone, reach, impressions, engagement,
       clicks, leads_count, appointments_count, rejection_reason, vehicle, offer, tone, language,
       target_audience, brief, scenes, platform, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.dealershipId,
      data.title,
      data.contentType || null,
      data.body || null,
      data.hashtags || null,
      data.campaignId || null,
      data.campaignName || null,
      data.createdBy || null,
      data.createdByUserId || null,
      data.scheduledAt || null,
      data.timezone || null,
      Number(data.reach) || 0,
      Number(data.impressions) || 0,
      Number(data.engagement) || 0,
      Number(data.clicks) || 0,
      Number(data.leadsCount) || 0,
      Number(data.appointmentsCount) || 0,
      data.rejectionReason || null,
      data.vehicle || null,
      data.offer || null,
      data.tone || null,
      data.language || null,
      data.targetAudience || null,
      data.brief || null,
      JSON.stringify(Array.isArray(data.scenes) ? data.scenes : []),
      data.platform,
      data.status || "DRAFT",
    ]
  );
  return findById(id);
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const map = {
    dealershipId: "dealership_id",
    title: "title",
    contentType: "content_type",
    body: "body",
    hashtags: "hashtags",
    campaignId: "campaign_id",
    campaignName: "campaign_name",
    createdBy: "created_by",
    createdByUserId: "created_by_user_id",
    scheduledAt: "scheduled_at",
    timezone: "timezone",
    reach: "reach",
    impressions: "impressions",
    engagement: "engagement",
    clicks: "clicks",
    leadsCount: "leads_count",
    appointmentsCount: "appointments_count",
    rejectionReason: "rejection_reason",
    vehicle: "vehicle",
    offer: "offer",
    tone: "tone",
    language: "language",
    targetAudience: "target_audience",
    brief: "brief",
    platform: "platform",
    status: "status",
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      fields.push(`${column} = ?`);
      params.push(data[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, "scenes")) {
    fields.push("scenes = ?");
    params.push(JSON.stringify(Array.isArray(data.scenes) ? data.scenes : []));
  }

  if (!fields.length) return findById(id);

  params.push(id);
  await pool.query(
    `UPDATE ai_content SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return findById(id);
}

async function remove(id) {
  await pool.query(`DELETE FROM ai_content WHERE id = ?`, [id]);
}

module.exports = {
  list,
  listByDealership,
  findById,
  listActivities,
  addActivity,
  create,
  update,
  remove,
  mapListItem,
};
