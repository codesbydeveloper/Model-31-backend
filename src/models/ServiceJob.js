const pool = require("../config/database");

const STATUS_LABELS = {
  CHECKED_IN: "Checked In",
  IN_WORK: "In Work",
  WAITING_ON_PARTS: "Waiting On Parts",
  READY: "Ready",
  DELAYED: "Delayed",
  DELIVERED: "Delivered",
};

const STATUS_ALIASES = {
  CHECKED_IN: "CHECKED_IN",
  IN_WORK: "IN_WORK",
  WAITING_ON_PARTS: "WAITING_ON_PARTS",
  READY: "READY",
  DELAYED: "DELAYED",
  DELIVERED: "DELIVERED",
  OPEN: "CHECKED_IN",
  IN_PROGRESS: "IN_WORK",
  COMPLETED: "DELIVERED",
  "CHECKED IN": "CHECKED_IN",
  "IN WORK": "IN_WORK",
  "WAITING ON PARTS": "WAITING_ON_PARTS",
};

function normalizeStatus(value, fallback = "CHECKED_IN") {
  if (!value) return fallback;
  const key = String(value).trim().toUpperCase().replace(/-/g, " ");
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  const underscored = key.replace(/ /g, "_");
  if (STATUS_ALIASES[underscored]) return STATUS_ALIASES[underscored];
  return null;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toDateKey(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatAppointment(dateValue, timeValue) {
  const time = String(timeValue || "").trim();
  const dateKey = toDateKey(dateValue);
  if (!dateKey && !time) return null;
  if (!dateKey) return time || null;
  const today = toDateKey(new Date());
  if (dateKey === today) return time ? `Today ${time}` : "Today";
  const [y, m, d] = dateKey.split("-");
  const label = `${m}/${d}/${y}`;
  return time ? `${label} ${time}` : label;
}

function mapJob(row) {
  if (!row) return null;
  const status = normalizeStatus(row.status) || "CHECKED_IN";
  const concern = row.concern || row.note || "";
  const hours = Number(row.hours_billed) || 0;
  const amount = Number(row.amount) || 0;
  const csi = row.csi_score === null || row.csi_score === undefined
    ? null
    : Number(row.csi_score);
  const appointment = formatAppointment(row.appointment_date, row.appointment_time);

  return {
    id: row.id,
    roNumber: row.id,
    dealershipId: row.dealership_id || null,
    advisorId: row.advisor_id || null,
    advisorName: row.advisor_name || null,
    technicianName: row.technician_name || "",
    customerName: row.customer_name,
    phone: row.phone || "",
    email: row.email || "",
    appointmentDate: toDateKey(row.appointment_date),
    appointmentTime: row.appointment_time || "",
    appointment,
    vehicle: row.vehicle || "",
    vin: row.vin || "",
    mileage: row.mileage === null || row.mileage === undefined ? null : Number(row.mileage),
    concern,
    note: concern,
    delayReason: row.delay_reason || "",
    csi,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    hours,
    hoursBilled: hours,
    amount,
    action: "Open",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    customer: {
      name: row.customer_name,
      phone: row.phone || "",
      email: row.email || "",
      appointment,
    },
    vehicleJob: {
      vehicle: row.vehicle || "",
      vin: row.vin || "",
      mileage: row.mileage === null || row.mileage === undefined ? null : Number(row.mileage),
      concern,
      advisor: row.advisor_name || "",
      technician: row.technician_name || "",
      hours,
      amount,
      delayReason: row.delay_reason || "",
      csi,
    },
  };
}

const SELECT_JOB = `
  SELECT j.*, u.name AS advisor_name
  FROM service_jobs j
  LEFT JOIN users u ON u.id = j.advisor_id
`;

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(`${SELECT_JOB} WHERE j.id = ? LIMIT 1`, [id]);
  return mapJob(rows[0]);
}

async function nextRoId() {
  const [rows] = await pool.query(
    `SELECT MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)) AS max_n
     FROM service_jobs
     WHERE id LIKE 'ro_%'`
  );
  const next = (Number(rows[0]?.max_n) || 1000) + 1;
  return `ro_${next}`;
}

async function listByDealership(dealershipId, query = {}) {
  const where = ["j.dealership_id = ?"];
  const params = [dealershipId];

  if (query.status) {
    const statuses = String(query.status)
      .split(",")
      .map((s) => normalizeStatus(s.trim()))
      .filter(Boolean);
    if (statuses.length === 1) {
      where.push("j.status = ?");
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      where.push(`j.status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  }

  if (query.advisorId) {
    where.push("j.advisor_id = ?");
    params.push(query.advisorId);
  }

  if (query.today === true || query.today === "true" || query.today === "1") {
    where.push(
      "(j.appointment_date = CURDATE() OR DATE(j.created_at) = CURDATE())"
    );
  }

  if (
    query.hasAppointment === true ||
    query.hasAppointment === "true" ||
    query.hasAppointment === "1"
  ) {
    where.push("j.appointment_date IS NOT NULL");
  }

  if (query.search) {
    where.push(
      "(j.id LIKE ? OR j.customer_name LIKE ? OR j.vehicle LIKE ? OR j.concern LIKE ? OR j.note LIKE ? OR j.technician_name LIKE ? OR j.vin LIKE ?)"
    );
    const like = `%${query.search}%`;
    params.push(like, like, like, like, like, like, like);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM service_jobs j WHERE ${where.join(" AND ")}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(query.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_JOB} WHERE ${where.join(" AND ")}
     ORDER BY j.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    jobs: rows.map(mapJob),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

function jobWriteValues(data) {
  return [
    data.advisorId || null,
    data.customerName,
    data.phone || null,
    data.email || null,
    data.appointmentDate || null,
    data.appointmentTime || null,
    data.vehicle || null,
    data.vin || null,
    data.mileage === undefined || data.mileage === null || data.mileage === ""
      ? null
      : Number(data.mileage),
    data.concern || data.note || null,
    data.technicianName || null,
    data.status || "CHECKED_IN",
    data.hoursBilled || data.hours || 0,
    data.amount || 0,
    data.delayReason || null,
    data.csi === undefined || data.csi === null || data.csi === ""
      ? null
      : Number(data.csi),
  ];
}

async function create(data) {
  const id = data.id || (await nextRoId());
  await pool.query(
    `INSERT INTO service_jobs
      (id, dealership_id, advisor_id, customer_name, phone, email,
       appointment_date, appointment_time, vehicle, vin, mileage, concern,
       technician_name, status, hours_billed, amount, delay_reason, csi_score, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.dealershipId,
      ...jobWriteValues(data),
      data.concern || data.note || null,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;
  const merged = {
    advisorId: data.advisorId !== undefined ? data.advisorId : existing.advisorId,
    customerName:
      data.customerName !== undefined ? data.customerName : existing.customerName,
    phone: data.phone !== undefined ? data.phone : existing.phone,
    email: data.email !== undefined ? data.email : existing.email,
    appointmentDate:
      data.appointmentDate !== undefined
        ? data.appointmentDate
        : existing.appointmentDate,
    appointmentTime:
      data.appointmentTime !== undefined
        ? data.appointmentTime
        : existing.appointmentTime,
    vehicle: data.vehicle !== undefined ? data.vehicle : existing.vehicle,
    vin: data.vin !== undefined ? data.vin : existing.vin,
    mileage: data.mileage !== undefined ? data.mileage : existing.mileage,
    concern:
      data.concern !== undefined
        ? data.concern
        : data.note !== undefined
          ? data.note
          : existing.concern,
    technicianName:
      data.technicianName !== undefined
        ? data.technicianName
        : existing.technicianName,
    status: data.status !== undefined ? data.status : existing.status,
    hoursBilled:
      data.hoursBilled !== undefined
        ? data.hoursBilled
        : data.hours !== undefined
          ? data.hours
          : existing.hours,
    amount: data.amount !== undefined ? data.amount : existing.amount,
    delayReason:
      data.delayReason !== undefined ? data.delayReason : existing.delayReason,
    csi: data.csi !== undefined ? data.csi : existing.csi,
  };
  await pool.query(
    `UPDATE service_jobs SET
      advisor_id = ?,
      customer_name = ?,
      phone = ?,
      email = ?,
      appointment_date = ?,
      appointment_time = ?,
      vehicle = ?,
      vin = ?,
      mileage = ?,
      concern = ?,
      technician_name = ?,
      status = ?,
      hours_billed = ?,
      amount = ?,
      delay_reason = ?,
      csi_score = ?,
      note = ?
     WHERE id = ?`,
    [...jobWriteValues(merged), merged.concern || null, id]
  );
  return findById(id);
}

async function getDashboardCounts(dealershipId) {
  const [rows] = await pool.query(
    `SELECT
      SUM(CASE WHEN status NOT IN ('DELIVERED', 'COMPLETED') THEN 1 ELSE 0 END) AS open_jobs,
      SUM(CASE WHEN status IN ('WAITING_ON_PARTS', 'DELAYED') THEN 1 ELSE 0 END) AS delayed_parts,
      SUM(CASE WHEN status IN ('DELIVERED', 'COMPLETED') THEN 1 ELSE 0 END) AS completed,
      COALESCE(SUM(hours_billed), 0) AS hours_billed
     FROM service_jobs
     WHERE dealership_id = ?`,
    [dealershipId]
  );
  const row = rows[0] || {};
  return {
    openJobs: Number(row.open_jobs) || 0,
    delayedOrParts: Number(row.delayed_parts) || 0,
    completed: Number(row.completed) || 0,
    hoursBilled: Number(Number(row.hours_billed || 0).toFixed(1)),
  };
}

async function getAdvisorDashboardCounts(dealershipId, advisorId) {
  const [rows] = await pool.query(
    `SELECT
      SUM(CASE WHEN appointment_date = CURDATE() THEN 1 ELSE 0 END) AS todays_appointments,
      SUM(CASE WHEN status = 'CHECKED_IN' THEN 1 ELSE 0 END) AS checked_in,
      SUM(CASE WHEN status = 'IN_WORK' THEN 1 ELSE 0 END) AS in_work,
      SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) AS ready_for_pickup
     FROM service_jobs
     WHERE dealership_id = ? AND advisor_id = ?`,
    [dealershipId, advisorId]
  );
  const row = rows[0] || {};
  return {
    todaysAppointments: Number(row.todays_appointments) || 0,
    checkedIn: Number(row.checked_in) || 0,
    inWork: Number(row.in_work) || 0,
    readyForPickup: Number(row.ready_for_pickup) || 0,
  };
}

module.exports = {
  STATUS_LABELS,
  normalizeStatus,
  findById,
  listByDealership,
  create,
  update,
  getDashboardCounts,
  getAdvisorDashboardCounts,
  mapJob,
};
