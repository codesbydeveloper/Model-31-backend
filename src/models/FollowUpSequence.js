const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row, stepsCount = null) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    targetAudience: row.target_audience || "",
    trigger: row.trigger_type || "",
    status: row.status || "DRAFT",
    steps: stepsCount != null ? stepsCount : Number(row.steps_count) || 0,
    activeLeads: Number(row.active_leads) || 0,
    completed: Number(row.completed) || 0,
    conversion: Number(row.conversion) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStep(row) {
  if (!row) return null;
  return {
    id: row.id,
    sequenceId: row.sequence_id,
    day: Number(row.day_offset) || 0,
    channel: row.channel || "",
    message: row.message || "",
    status: row.status || "ACTIVE",
    order: Number(row.step_order) || 0,
    createdAt: row.created_at,
  };
}

function mapActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    sequenceId: row.sequence_id,
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
    where.push("s.status = ?");
    params.push(String(query.status).toUpperCase());
  }

  if (query.search) {
    where.push(
      "(s.name LIKE ? OR s.description LIKE ? OR s.target_audience LIKE ? OR s.trigger_type LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM follow_up_sequences s ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT s.*,
      (SELECT COUNT(*) FROM follow_up_sequence_steps st WHERE st.sequence_id = s.id) AS steps_count
     FROM follow_up_sequences s
     ${whereSql}
     ORDER BY s.updated_at DESC, s.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const total = Number(countRows[0].total) || 0;
  return {
    items: rows.map((row) => mapRow(row)),
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
    `SELECT s.*,
      (SELECT COUNT(*) FROM follow_up_sequence_steps st WHERE st.sequence_id = s.id) AS steps_count
     FROM follow_up_sequences s
     WHERE s.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function findByName(name) {
  if (!name) return null;
  const [rows] = await pool.query(
    `SELECT * FROM follow_up_sequences WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name]
  );
  return mapRow(rows[0], 0);
}

async function listSteps(sequenceId) {
  const [rows] = await pool.query(
    `SELECT * FROM follow_up_sequence_steps
     WHERE sequence_id = ?
     ORDER BY step_order ASC, day_offset ASC`,
    [sequenceId]
  );
  return rows.map(mapStep);
}

async function listActivities(sequenceId) {
  const [rows] = await pool.query(
    `SELECT * FROM follow_up_sequence_activities
     WHERE sequence_id = ?
     ORDER BY created_at DESC`,
    [sequenceId]
  );
  return rows.map(mapActivity);
}

async function create(data) {
  const id = data.id || `fu_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO follow_up_sequences
      (id, name, description, target_audience, trigger_type, status,
       active_leads, completed, conversion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.description || null,
      data.targetAudience || null,
      data.trigger || data.triggerType || null,
      (data.status || "DRAFT").toUpperCase(),
      Number(data.activeLeads) || 0,
      Number(data.completed) || 0,
      Number(data.conversion) || 0,
    ]
  );
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query(`UPDATE follow_up_sequences SET status = ? WHERE id = ?`, [
    status,
    id,
  ]);
  return findById(id);
}

async function addStep(sequenceId, step) {
  const id = step.id || `fus_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO follow_up_sequence_steps
      (id, sequence_id, day_offset, channel, message, status, step_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      sequenceId,
      Number(step.day) || 0,
      step.channel || "Platform Message",
      step.message || "",
      (step.status || "ACTIVE").toUpperCase(),
      Number(step.order) || 0,
    ]
  );
  return id;
}

async function addActivity(sequenceId, activityType, detail, createdAt) {
  const id = `fua_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO follow_up_sequence_activities
      (id, sequence_id, activity_type, detail, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, sequenceId, activityType, detail || "", createdAt || new Date()]
  );
  return id;
}

module.exports = {
  list,
  findById,
  findByName,
  listSteps,
  listActivities,
  create,
  updateStatus,
  addStep,
  addActivity,
};
