const ServiceJob = require("../models/ServiceJob");
const Dealership = require("../models/Dealership");
const AppError = require("../utils/AppError");

const JOB_STATUSES = Object.keys(ServiceJob.STATUS_LABELS);

async function requireDealership(dealershipId) {
  const dealership = await Dealership.findById(dealershipId);
  if (!dealership) throw new AppError("Dealership not found", 404);
  return dealership;
}

async function assertMyJob(jobId, dealershipId, advisorId) {
  const job = await ServiceJob.findById(jobId);
  if (!job || job.dealershipId !== dealershipId || job.advisorId !== advisorId) {
    throw new AppError("Job not found", 404);
  }
  return job;
}

function parseStatus(value, fallback = "CHECKED_IN") {
  const status = ServiceJob.normalizeStatus(value, fallback);
  if (!status || !JOB_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${JOB_STATUSES.join(", ")}`, 400);
  }
  return status;
}

function firstName(name) {
  const value = String(name || "").trim();
  if (!value) return "there";
  return value.split(/\s+/)[0];
}

function jobRow(job) {
  return {
    id: job.id,
    roNumber: job.roNumber,
    customerName: job.customerName,
    vehicle: job.vehicle,
    appointment: job.appointment,
    status: job.status,
    statusLabel: job.statusLabel,
    amount: job.amount,
    action: "Open",
  };
}

async function getDashboard(user) {
  const dealershipId = user.dealershipId;
  const advisorId = user.id;
  const dealership = await requireDealership(dealershipId);
  const stats = await ServiceJob.getAdvisorDashboardCounts(dealershipId, advisorId);
  const todayJobs = await ServiceJob.listByDealership(dealershipId, {
    advisorId,
    today: true,
    page: 1,
    limit: 8,
  });

  return {
    title: "Service Advisor",
    greeting: `Good day, ${firstName(user.name)}`,
    subtitle: `${dealership.name} - Service Advisor desk`,
    stats: {
      todaysAppointments: stats.todaysAppointments,
      checkedIn: stats.checkedIn,
      inWork: stats.inWork,
      readyForPickup: stats.readyForPickup,
    },
    myJobsToday: todayJobs.jobs.map(jobRow),
  };
}

async function listJobs(user, query = {}) {
  await requireDealership(user.dealershipId);
  const data = await ServiceJob.listByDealership(user.dealershipId, {
    ...query,
    advisorId: user.id,
  });
  return {
    title: "Repair Orders",
    subtitle: "Your open and completed service jobs.",
    jobs: data.jobs.map((job) => ({
      ...jobRow(job),
      technicianName: job.technicianName || "",
      advisorName: job.advisorName || user.name,
    })),
    pagination: data.pagination,
    statuses: JOB_STATUSES.map((status) => ({
      value: status,
      label: ServiceJob.STATUS_LABELS[status],
    })),
  };
}

async function getJob(user, jobId) {
  const job = await assertMyJob(jobId, user.dealershipId, user.id);
  return {
    title: "Repair Order",
    job,
  };
}

async function updateJob(user, jobId, body = {}) {
  await assertMyJob(jobId, user.dealershipId, user.id);
  const patch = {};
  if (body.status) patch.status = parseStatus(body.status);
  if (body.concern !== undefined) patch.concern = body.concern;
  if (body.note !== undefined) patch.note = body.note;
  if (body.technicianName !== undefined) patch.technicianName = body.technicianName;
  if (body.hours !== undefined) patch.hours = body.hours;
  if (body.hoursBilled !== undefined) patch.hoursBilled = body.hoursBilled;
  if (body.delayReason !== undefined) patch.delayReason = body.delayReason;
  const job = await ServiceJob.update(jobId, patch);
  return { message: "Job updated", job };
}

async function listAppointments(user, query = {}) {
  await requireDealership(user.dealershipId);
  const data = await ServiceJob.listByDealership(user.dealershipId, {
    ...query,
    advisorId: user.id,
    hasAppointment: true,
  });
  return {
    title: "Appointments",
    subtitle: "Today and upcoming service appointments.",
    appointments: data.jobs.map((job) => ({
      id: job.id,
      roNumber: job.roNumber,
      customerName: job.customerName,
      vehicle: job.vehicle,
      appointmentDate: job.appointmentDate,
      appointmentTime: job.appointmentTime,
      appointment: job.appointment,
      status: job.status,
      statusLabel: job.statusLabel,
      phone: job.phone || "",
      action: "Open",
    })),
    pagination: data.pagination,
  };
}

module.exports = {
  getDashboard,
  listJobs,
  getJob,
  updateJob,
  listAppointments,
};
