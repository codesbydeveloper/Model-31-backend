const { randomUUID } = require("crypto");
const pool = require("../config/database");

function formatWaitTime(createdAt) {
  if (!createdAt) return "-";
  const ms = Date.now() - new Date(createdAt).getTime();
  if (ms < 0) return "00:00";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatResponseTime(assignedAt, acceptedAt) {
  if (!assignedAt || !acceptedAt) return "-";
  const ms = new Date(acceptedAt).getTime() - new Date(assignedAt).getTime();
  if (ms < 0) return "-";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone || "",
    customerEmail: row.customer_email || "",
    vehicle: row.vehicle || "",
    budget: row.budget || "",
    timeline: row.timeline || "",
    location: row.location || "",
    financing: row.financing || "",
    score: Number(row.score) || 0,
    tier: row.tier,
    status: row.status,
    dealershipId: row.dealership_id || null,
    dealership: row.dealership_name || null,
    salespersonId: row.salesperson_id || null,
    salesperson: row.salesperson_name || "Unassigned",
    source: row.source || "",
    pipeline: row.pipeline,
    notes: row.notes || "",
    priority: row.priority || null,
    dispatchStatus: row.dispatch_status || null,
    assignedAt: row.assigned_at || null,
    acceptedAt: row.accepted_at || null,
    responseTime: formatResponseTime(row.assigned_at, row.accepted_at),
    waitTime: formatWaitTime(row.created_at),
    escalationReason: row.escalation_reason || null,
    escalationPriority: row.escalation_priority || null,
    escalationStatus: row.escalation_status || null,
    escalatedAt: row.escalated_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `
  SELECT l.*,
    d.name AS dealership_name,
    u.name AS salesperson_name
  FROM leads l
  LEFT JOIN dealerships d ON d.id = l.dealership_id
  LEFT JOIN users u ON u.id = l.salesperson_id
`;

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(`${SELECT_LIST} WHERE l.id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function list({
  search = "",
  dealershipId = "",
  salespersonId = "",
  status = "",
  pipeline = "",
  dispatchStatus = "",
  excludePipeline = "",
  page = 1,
  limit = 10,
} = {}) {
  const where = [];
  const params = [];

  if (dealershipId) {
    where.push("l.dealership_id = ?");
    params.push(dealershipId);
  }
  if (salespersonId) {
    where.push("l.salesperson_id = ?");
    params.push(salespersonId);
  }
  if (status) {
    where.push("l.status = ?");
    params.push(status);
  }
  if (pipeline) {
    where.push("l.pipeline = ?");
    params.push(pipeline);
  }
  if (excludePipeline) {
    where.push("l.pipeline <> ?");
    params.push(excludePipeline);
  }
  if (dispatchStatus) {
    where.push("l.dispatch_status = ?");
    params.push(dispatchStatus);
  }
  if (search) {
    where.push(
      `(l.id LIKE ? OR l.customer_name LIKE ? OR l.vehicle LIKE ? OR l.source LIKE ?)`
    );
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM leads l ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereClause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    leads: rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function getStats(dealershipId = null) {
  const params = [];
  let where = "";
  if (dealershipId) {
    where = "WHERE dealership_id = ?";
    params.push(dealershipId);
  }

  const [rows] = await pool.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS new_count,
      SUM(CASE WHEN status = 'QUALIFYING' THEN 1 ELSE 0 END) AS qualifying_count,
      SUM(CASE WHEN status = 'QUALIFIED' THEN 1 ELSE 0 END) AS qualified_count,
      SUM(CASE WHEN status = 'CONTACTED' THEN 1 ELSE 0 END) AS contacted_count,
      SUM(CASE WHEN status = 'APPOINTMENT' THEN 1 ELSE 0 END) AS appointment_count,
      SUM(CASE WHEN status = 'ROUTED' THEN 1 ELSE 0 END) AS routed_count,
      SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) AS closed_count
    FROM leads
    ${where}
  `,
    params
  );

  const row = rows[0] || {};
  return {
    total: Number(row.total) || 0,
    new: Number(row.new_count) || 0,
    qualifying: Number(row.qualifying_count) || 0,
    qualified: Number(row.qualified_count) || 0,
    contacted: Number(row.contacted_count) || 0,
    appointment: Number(row.appointment_count) || 0,
    routed: Number(row.routed_count) || 0,
    closed: Number(row.closed_count) || 0,
  };
}

async function create(data) {
  const id = data.id || `lead_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO leads
      (id, customer_name, customer_phone, customer_email, vehicle, budget, timeline,
       location, financing, score, tier, status, dealership_id, salesperson_id,
       source, pipeline, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerName,
      data.customerPhone || null,
      data.customerEmail || null,
      data.vehicle || null,
      data.budget || null,
      data.timeline || null,
      data.location || null,
      data.financing || null,
      data.score ?? 0,
      data.tier || "Tier D",
      data.status || "NEW",
      data.dealershipId || null,
      data.salespersonId || null,
      data.source || null,
      data.pipeline || "MODEL 31",
      data.notes || null,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  await pool.query(
    `UPDATE leads SET
      customer_name = ?,
      customer_phone = ?,
      customer_email = ?,
      vehicle = ?,
      budget = ?,
      timeline = ?,
      location = ?,
      financing = ?,
      score = ?,
      tier = ?,
      status = ?,
      dealership_id = ?,
      salesperson_id = ?,
      source = ?,
      pipeline = ?,
      notes = ?
     WHERE id = ?`,
    [
      data.customerName,
      data.customerPhone || null,
      data.customerEmail || null,
      data.vehicle || null,
      data.budget || null,
      data.timeline || null,
      data.location || null,
      data.financing || null,
      data.score ?? 0,
      data.tier || "Tier D",
      data.status || "NEW",
      data.dealershipId || null,
      data.salespersonId || null,
      data.source || null,
      data.pipeline || "MODEL 31",
      data.notes || null,
      id,
    ]
  );
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query(`UPDATE leads SET status = ? WHERE id = ?`, [status, id]);
  return findById(id);
}

async function assignSalesperson(id, salespersonId) {
  await pool.query(
    `UPDATE leads SET
      salesperson_id = ?,
      assigned_at = CASE WHEN ? IS NULL THEN NULL ELSE NOW() END,
      dispatch_status = CASE
        WHEN ? IS NULL THEN 'WAITING'
        ELSE 'ASSIGNED'
      END
     WHERE id = ?`,
    [salespersonId || null, salespersonId || null, salespersonId || null, id]
  );
  return findById(id);
}

async function acceptAssignment(id) {
  await pool.query(
    `UPDATE leads SET accepted_at = NOW(), dispatch_status = 'ACCEPTED' WHERE id = ?`,
    [id]
  );
  return findById(id);
}

async function escalate(id, { reason, priority }) {
  await pool.query(
    `UPDATE leads SET
      dispatch_status = 'ESCALATED',
      escalation_reason = ?,
      escalation_priority = ?,
      escalation_status = 'OPEN',
      escalated_at = NOW()
     WHERE id = ?`,
    [reason || "System escalation", priority || "MEDIUM", id]
  );
  return findById(id);
}

async function resolveEscalation(id) {
  await pool.query(
    `UPDATE leads SET escalation_status = 'RESOLVED' WHERE id = ?`,
    [id]
  );
  return findById(id);
}

async function listEscalations({ search = "", page = 1, limit = 10 } = {}) {
  return list({
    search,
    excludePipeline: "MODEL 31",
    dispatchStatus: "ESCALATED",
    page,
    limit,
  });
}

async function listQueue({ search = "", page = 1, limit = 10 } = {}) {
  const where = [
    "l.pipeline = 'DEALERSHIP'",
    "(l.dispatch_status = 'WAITING' OR (l.dispatch_status = 'QUALIFIED' AND l.salesperson_id IS NULL))",
  ];
  const params = [];

  if (search) {
    where.push(
      `(l.id LIKE ? OR l.customer_name LIKE ? OR l.vehicle LIKE ? OR l.source LIKE ?)`
    );
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM leads l ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} ${whereClause}
     ORDER BY
       FIELD(l.priority, 'HIGH', 'MEDIUM', 'LOW') ASC,
       l.created_at ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    leads: rows.map((row) => {
      const mapped = mapRow(row);
      return { ...mapped, dispatchStatus: mapped.dispatchStatus || "WAITING" };
    }),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

module.exports = {
  findById,
  list,
  listQueue,
  listEscalations,
  getStats,
  create,
  update,
  updateStatus,
  assignSalesperson,
  acceptAssignment,
  escalate,
  resolveEscalation,
};
