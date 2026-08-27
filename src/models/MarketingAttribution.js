const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    pipeline: row.pipeline,
    campaign: row.campaign_name || "",
    platform: row.platform,
    content: row.content_label || "",
    leads: Number(row.leads) || 0,
    qualified: Number(row.qualified) || 0,
    appointments: Number(row.appointments) || 0,
    sold: Number(row.sold) || 0,
    revenue: Number(row.revenue) || 0,
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

  const pipeline = String(query.pipeline || "ALL").toUpperCase();
  if (pipeline && pipeline !== "ALL" && pipeline !== "ALL PIPELINES") {
    where.push("pipeline = ?");
    params.push(pipeline === "MODEL31" ? "MODEL 31" : pipeline);
  }
  if (query.platform && query.platform !== "ALL") {
    where.push("platform = ?");
    params.push(query.platform);
  }
  if (query.search) {
    where.push(
      "(source LIKE ? OR campaign_name LIKE ? OR content_label LIKE ? OR platform LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_attribution ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT * FROM marketing_attribution
     ${whereSql}
     ORDER BY revenue DESC, leads DESC, source ASC
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

async function aggregateByPipeline() {
  const [rows] = await pool.query(
    `SELECT pipeline,
      COALESCE(SUM(leads), 0) AS leads,
      COALESCE(SUM(qualified), 0) AS qualified,
      COALESCE(SUM(appointments), 0) AS appointments,
      COALESCE(SUM(sold), 0) AS sold,
      COALESCE(SUM(revenue), 0) AS revenue
     FROM marketing_attribution
     GROUP BY pipeline`
  );
  const result = {
    "MODEL 31": {
      leads: 0,
      qualified: 0,
      appointments: 0,
      sold: 0,
      revenue: 0,
    },
    DEALERSHIP: {
      leads: 0,
      qualified: 0,
      appointments: 0,
      sold: 0,
      revenue: 0,
    },
  };
  for (const row of rows) {
    const key = String(row.pipeline || "").toUpperCase();
    const bucket = key.includes("MODEL") ? "MODEL 31" : "DEALERSHIP";
    result[bucket] = {
      leads: Number(row.leads) || 0,
      qualified: Number(row.qualified) || 0,
      appointments: Number(row.appointments) || 0,
      sold: Number(row.sold) || 0,
      revenue: Number(row.revenue) || 0,
    };
  }
  return result;
}

async function create(data) {
  const id = data.id || `attr_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_attribution
      (id, source, pipeline, campaign_name, platform, content_label,
       leads, qualified, appointments, sold, revenue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.source,
      data.pipeline,
      data.campaign || data.campaignName || null,
      data.platform,
      data.content || data.contentLabel || null,
      Number(data.leads) || 0,
      Number(data.qualified) || 0,
      Number(data.appointments) || 0,
      Number(data.sold) || 0,
      Number(data.revenue) || 0,
    ]
  );
  return id;
}

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT * FROM marketing_attribution WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

module.exports = {
  list,
  aggregateByPipeline,
  create,
  findById,
  mapRow,
};
