const pool = require("../config/database");
const ServiceJob = require("../models/ServiceJob");
const User = require("../models/User");
const Dealership = require("../models/Dealership");
const AppError = require("../utils/AppError");

const JOB_STATUSES = Object.keys(ServiceJob.STATUS_LABELS);
const DELAYED_STATUSES = ["WAITING_ON_PARTS", "DELAYED"];
const DONE_STATUSES = ["DELIVERED", "COMPLETED"];

async function requireDealership(dealershipId) {
  const dealership = await Dealership.findById(dealershipId);
  if (!dealership) throw new AppError("Dealership not found", 404);
  return dealership;
}

async function assertJobInDealership(jobId, dealershipId) {
  const job = await ServiceJob.findById(jobId);
  if (!job || job.dealershipId !== dealershipId) {
    throw new AppError("Job not found", 404);
  }
  return job;
}

async function resolveAdvisor(dealershipId, advisorId) {
  if (!advisorId) return null;
  const advisor = await User.findById(advisorId);
  if (
    !advisor ||
    advisor.role !== "Service Advisor" ||
    advisor.dealershipId !== dealershipId
  ) {
    throw new AppError("Service Advisor not found in this dealership", 404);
  }
  return advisor.id;
}

function parseStatus(value, fallback = "CHECKED_IN") {
  const status = ServiceJob.normalizeStatus(value, fallback);
  if (!status || !JOB_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${JOB_STATUSES.join(", ")}`, 400);
  }
  return status;
}

function jobPayload(body, { requireCustomer = false } = {}) {
  const customerName = String(body.customerName || body.customer?.name || "").trim();
  if (requireCustomer && !customerName) {
    throw new AppError("customerName is required", 400);
  }
  return {
    customerName: customerName || undefined,
    phone: body.phone !== undefined ? body.phone : body.customer?.phone,
    email: body.email !== undefined ? body.email : body.customer?.email,
    appointmentDate: body.appointmentDate,
    appointmentTime: body.appointmentTime,
    vehicle: body.vehicle !== undefined ? body.vehicle : body.vehicleJob?.vehicle,
    vin: body.vin !== undefined ? body.vin : body.vehicleJob?.vin,
    mileage: body.mileage !== undefined ? body.mileage : body.vehicleJob?.mileage,
    concern:
      body.concern !== undefined
        ? body.concern
        : body.note !== undefined
          ? body.note
          : body.vehicleJob?.concern,
    technicianName:
      body.technicianName !== undefined
        ? body.technicianName
        : body.technician !== undefined
          ? body.technician
          : body.vehicleJob?.technician,
    hoursBilled:
      body.hoursBilled !== undefined
        ? body.hoursBilled
        : body.hours !== undefined
          ? body.hours
          : body.vehicleJob?.hours,
    amount: body.amount !== undefined ? body.amount : body.vehicleJob?.amount,
    delayReason:
      body.delayReason !== undefined
        ? body.delayReason
        : body.vehicleJob?.delayReason,
    csi: body.csi !== undefined ? body.csi : body.vehicleJob?.csi,
    advisorId: body.advisorId,
    status: body.status,
  };
}

async function listAdvisors(dealershipId) {
  await requireDealership(dealershipId);
  const [rows] = await pool.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      COALESCE(SUM(CASE WHEN j.status NOT IN ('DELIVERED', 'COMPLETED') THEN 1 ELSE 0 END), 0) AS open_jobs,
      COALESCE(SUM(CASE WHEN j.status IN ('DELIVERED', 'COMPLETED') AND DATE(j.updated_at) = CURDATE() THEN 1 ELSE 0 END), 0) AS completed_today,
      COALESCE(SUM(CASE WHEN j.status IN ('WAITING_ON_PARTS', 'DELAYED') THEN 1 ELSE 0 END), 0) AS delayed,
      COALESCE(SUM(CASE WHEN j.status IN ('DELIVERED', 'COMPLETED') THEN 1 ELSE 0 END), 0) AS done_count,
      ROUND(AVG(j.csi_score)) AS avg_csi
     FROM users u
     LEFT JOIN service_jobs j
       ON j.advisor_id = u.id AND j.dealership_id = u.dealership_id
     WHERE u.dealership_id = ?
       AND u.role = 'Service Advisor'
       AND u.status = 'Active'
     GROUP BY u.id, u.name, u.email
     ORDER BY u.name ASC`,
    [dealershipId]
  );

  return {
    title: "Service Advisors",
    subtitle: "Advisor load, completions, and CSI.",
    advisors: rows.map((row) => {
      const openJobs = Number(row.open_jobs) || 0;
      const completedToday = Number(row.completed_today) || 0;
      const delayed = Number(row.delayed) || 0;
      const doneCount = Number(row.done_count) || 0;
      const csi = Number(row.avg_csi) || Math.min(99, 90 + doneCount);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        openJobs,
        completedToday,
        delayed,
        csi,
        openCount: openJobs,
        doneCount,
        subtitle: `${openJobs} open · CSI ${csi}`,
        doneLabel: `${doneCount} done`,
      };
    }),
  };
}

async function getDashboard(dealershipId) {
  const dealership = await requireDealership(dealershipId);
  const stats = await ServiceJob.getDashboardCounts(dealershipId);
  const delayed = await ServiceJob.listByDealership(dealershipId, {
    status: DELAYED_STATUSES.join(","),
    page: 1,
    limit: 5,
  });
  const { advisors } = await listAdvisors(dealershipId);

  return {
    title: "Service Manager",
    subtitle: `${dealership.name} · Open jobs, delays, and advisor load`,
    stats: {
      openJobs: stats.openJobs,
      delayedOrParts: stats.delayedOrParts,
      completed: stats.completed,
      hoursBilled: stats.hoursBilled,
    },
    delayedJobs: delayed.jobs.map((job) => ({
      id: job.id,
      customerName: job.customerName,
      note: job.concern || job.note,
      status: job.status,
      statusLabel: job.statusLabel,
      advisorId: job.advisorId,
      advisorName: job.advisorName,
    })),
    advisors: advisors.slice(0, 6),
  };
}

async function listJobs(dealershipId, query = {}) {
  await requireDealership(dealershipId);
  if (query.status === "DELAYED_OR_PARTS") {
    query = { ...query, status: DELAYED_STATUSES.join(",") };
  }
  if (query.status && query.status !== DELAYED_STATUSES.join(",")) {
    const statuses = String(query.status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const status of statuses) {
      parseStatus(status);
    }
  }
  const data = await ServiceJob.listByDealership(dealershipId, query);
  return {
    title: "Shop Repair Orders",
    subtitle: "All open and completed service jobs.",
    jobs: data.jobs.map((job) => ({
      id: job.id,
      roNumber: job.roNumber,
      customerName: job.customerName,
      vehicle: job.vehicle,
      advisorName: job.advisorName || "",
      technicianName: job.technicianName || "",
      status: job.status,
      statusLabel: job.statusLabel,
      amount: job.amount,
      action: "Open",
    })),
    pagination: data.pagination,
    statuses: JOB_STATUSES.map((status) => ({
      value: status,
      label: ServiceJob.STATUS_LABELS[status],
    })),
  };
}

async function listDelayedJobs(dealershipId, query = {}) {
  await requireDealership(dealershipId);
  const data = await ServiceJob.listByDealership(dealershipId, {
    ...query,
    status: DELAYED_STATUSES.join(","),
  });
  return {
    title: "Delayed Jobs",
    subtitle: "Jobs waiting on parts or delayed in the shop.",
    jobs: data.jobs.map((job) => ({
      id: job.id,
      roNumber: job.roNumber,
      customerName: job.customerName,
      vehicle: job.vehicle,
      advisorName: job.advisorName || "",
      status: job.status,
      statusLabel: job.statusLabel,
      reason: job.delayReason || job.concern || job.note || "",
      action: "Open",
    })),
    pagination: data.pagination,
  };
}

async function getJob(dealershipId, jobId) {
  const job = await assertJobInDealership(jobId, dealershipId);
  return {
    title: "Repair Order",
    job,
  };
}

async function createJob(dealershipId, body = {}) {
  await requireDealership(dealershipId);
  const payload = jobPayload(body, { requireCustomer: true });
  const status = parseStatus(payload.status, "CHECKED_IN");
  const advisorId = await resolveAdvisor(dealershipId, payload.advisorId);
  const job = await ServiceJob.create({
    dealershipId,
    ...payload,
    advisorId,
    status,
  });
  return { message: "Job created", job };
}

async function updateJob(dealershipId, jobId, body = {}) {
  await assertJobInDealership(jobId, dealershipId);
  const payload = jobPayload(body);
  if (payload.status) payload.status = parseStatus(payload.status);
  if (payload.advisorId) {
    payload.advisorId = await resolveAdvisor(dealershipId, payload.advisorId);
  }
  const job = await ServiceJob.update(jobId, payload);
  return { message: "Job updated", job };
}

module.exports = {
  getDashboard,
  listJobs,
  listDelayedJobs,
  getJob,
  createJob,
  updateJob,
  listAdvisors,
};
