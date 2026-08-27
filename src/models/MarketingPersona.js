const { randomUUID } = require("crypto");
const pool = require("../config/database");

function parsePlatforms(value, primaryPlatform) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }
  return primaryPlatform ? [primaryPlatform] : [];
}

function mapRow(row) {
  if (!row) return null;
  const primaryPlatform = row.primary_platform || "Instagram";
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    targetAudience: row.target_audience || "",
    tone: row.tone || "Friendly",
    language: row.language || "English",
    primaryPlatform,
    platforms: parsePlatforms(row.platforms, primaryPlatform),
    status: row.status || "ACTIVE",
    followers: Number(row.followers) || 0,
    engagement: Number(row.engagement) || 0,
    leads: Number(row.leads_count) || 0,
    appointments: Number(row.appointments) || 0,
    sold: Number(row.sold) || 0,
    dmInteractions: Number(row.dm_interactions) || 0,
    storyInteractions: Number(row.story_interactions) || 0,
    returningVisitors: Number(row.returning_visitors) || 0,
    intentSignals: Number(row.intent_signals) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCard(persona) {
  if (!persona) return null;
  return {
    id: persona.id,
    name: persona.name,
    description: persona.description,
    targetAudience: persona.targetAudience,
    tone: persona.tone,
    language: persona.language,
    primaryPlatform: persona.primaryPlatform,
    status: persona.status,
    engagement: persona.engagement,
    leads: persona.leads,
    appointments: persona.appointments,
    sold: persona.sold,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("status = ?");
    params.push(String(query.status).toUpperCase());
  }

  if (query.search) {
    where.push(
      "(name LIKE ? OR description LIKE ? OR target_audience LIKE ? OR tone LIKE ? OR language LIKE ? OR primary_platform LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_personas ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT * FROM marketing_personas
     ${whereSql}
     ORDER BY name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total) || 0;
  return {
    items: rows.map((row) => mapCard(mapRow(row))),
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
    `SELECT * FROM marketing_personas WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function findByName(name) {
  if (!name) return null;
  const [rows] = await pool.query(
    `SELECT * FROM marketing_personas WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name]
  );
  return mapRow(rows[0]);
}

async function create(data) {
  const id = data.id || `mp_${randomUUID().slice(0, 8)}`;
  const primaryPlatform = data.primaryPlatform || "Instagram";
  const platforms = Array.isArray(data.platforms)
    ? data.platforms
    : [primaryPlatform];

  await pool.query(
    `INSERT INTO marketing_personas
      (id, name, description, target_audience, tone, language, primary_platform,
       platforms, status, followers, engagement, leads_count, appointments, sold,
       dm_interactions, story_interactions, returning_visitors, intent_signals)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description || null,
      data.targetAudience || null,
      data.tone || "Friendly",
      data.language || "English",
      primaryPlatform,
      JSON.stringify(platforms),
      (data.status || "ACTIVE").toUpperCase(),
      Number(data.followers) || 0,
      Number(data.engagement) || 0,
      Number(data.leads) || 0,
      Number(data.appointments) || 0,
      Number(data.sold) || 0,
      Number(data.dmInteractions) || 0,
      Number(data.storyInteractions) || 0,
      Number(data.returningVisitors) || 0,
      Number(data.intentSignals) || 0,
    ]
  );

  return findById(id);
}

module.exports = {
  list,
  findById,
  findByName,
  create,
  mapCard,
};
