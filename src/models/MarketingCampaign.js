const { randomUUID } = require("crypto");
const pool = require("../config/database");

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parsePlatforms(value) {
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
  return [];
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    objective: row.objective || "Lead Generation",
    platforms: parsePlatforms(row.platforms),
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    budget: Number(row.budget) || 0,
    targetAudience: row.target_audience || "",
    description: row.description || "",
    status: String(row.status || "ACTIVE").toUpperCase(),
    contentCount: Number(row.content_count) || 0,
    reach: Number(row.reach) || 0,
    engagement: Number(row.engagement) || 0,
    leads: Number(row.leads_count) || 0,
    appointments: Number(row.appointments_count) || 0,
    soldDeals: Number(row.sold_deals) || 0,
    revenue: Number(row.revenue) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapListItem(campaign) {
  if (!campaign) return null;
  return {
    id: campaign.id,
    name: campaign.name,
    dealershipId: campaign.dealershipId,
    dealershipName: campaign.dealershipName,
    objective: campaign.objective,
    platforms: campaign.platforms,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    budget: campaign.budget,
    contentCount: campaign.contentCount,
    leads: campaign.leads,
    status: campaign.status,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 8));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.search) {
    where.push(
      "(c.name LIKE ? OR d.name LIKE ? OR c.objective LIKE ? OR c.target_audience LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }
  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("c.status = ?");
    params.push(String(query.status).toUpperCase());
  }
  if (query.dealershipId) {
    where.push("c.dealership_id = ?");
    params.push(query.dealershipId);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM marketing_campaigns c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS dealership_name,
      (SELECT COUNT(*) FROM ai_content ac WHERE ac.campaign_id = c.id) AS content_count
     FROM marketing_campaigns c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     ${whereSql}
     ORDER BY c.start_date DESC, c.name ASC
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

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS dealership_name,
      (SELECT COUNT(*) FROM ai_content ac WHERE ac.campaign_id = c.id) AS content_count
     FROM marketing_campaigns c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function findByName(name) {
  if (!name) return null;
  const [rows] = await pool.query(
    `SELECT c.*, d.name AS dealership_name,
      (SELECT COUNT(*) FROM ai_content ac WHERE ac.campaign_id = c.id) AS content_count
     FROM marketing_campaigns c
     LEFT JOIN dealerships d ON d.id = c.dealership_id
     WHERE LOWER(c.name) = LOWER(?) LIMIT 1`,
    [name]
  );
  return mapRow(rows[0]);
}

async function create(data) {
  const id = data.id || `camp_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_campaigns
      (id, name, dealership_id, objective, platforms, start_date, end_date, budget,
       target_audience, description, status, reach, engagement, leads_count,
       appointments_count, sold_deals, revenue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.dealershipId,
      data.objective || "Lead Generation",
      JSON.stringify(Array.isArray(data.platforms) ? data.platforms : []),
      data.startDate || null,
      data.endDate || null,
      Number(data.budget) || 0,
      data.targetAudience || null,
      data.description || null,
      data.status || "ACTIVE",
      Number(data.reach) || 0,
      Number(data.engagement) || 0,
      Number(data.leads) || 0,
      Number(data.appointments) || 0,
      Number(data.soldDeals) || 0,
      Number(data.revenue) || 0,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  const fields = [];
  const params = [];
  const map = {
    name: "name",
    dealershipId: "dealership_id",
    objective: "objective",
    startDate: "start_date",
    endDate: "end_date",
    budget: "budget",
    targetAudience: "target_audience",
    description: "description",
    status: "status",
    reach: "reach",
    engagement: "engagement",
    leads: "leads_count",
    appointments: "appointments_count",
    soldDeals: "sold_deals",
    revenue: "revenue",
  };

  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      fields.push(`${column} = ?`);
      params.push(data[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(data, "platforms")) {
    fields.push("platforms = ?");
    params.push(JSON.stringify(Array.isArray(data.platforms) ? data.platforms : []));
  }

  if (!fields.length) return findById(id);

  params.push(id);
  await pool.query(
    `UPDATE marketing_campaigns SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return findById(id);
}

module.exports = {
  list,
  findById,
  findByName,
  create,
  update,
  mapListItem,
  formatDate,
};
