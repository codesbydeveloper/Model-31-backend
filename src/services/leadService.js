const Lead = require("../models/Lead");
const Dealership = require("../models/Dealership");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const { LEAD_STATUSES, LEAD_TIERS, LEAD_PIPELINES, LEAD_FINANCING } = require("../utils/constants");

function validatePayload(body, { partial = false } = {}) {
  if (!partial && (!body.customerName || String(body.customerName).trim() === "")) {
    throw new AppError("Customer name is required", 400);
  }
  if (body.status && !LEAD_STATUSES.includes(body.status)) {
    throw new AppError(`status must be one of: ${LEAD_STATUSES.join(", ")}`, 400);
  }
  if (body.tier && !LEAD_TIERS.includes(body.tier)) {
    throw new AppError(`tier must be one of: ${LEAD_TIERS.join(", ")}`, 400);
  }
  if (body.pipeline && !LEAD_PIPELINES.includes(body.pipeline)) {
    throw new AppError(`pipeline must be one of: ${LEAD_PIPELINES.join(", ")}`, 400);
  }
  if (body.financing && !LEAD_FINANCING.includes(body.financing)) {
    throw new AppError(`financing must be one of: ${LEAD_FINANCING.join(", ")}`, 400);
  }
  if (body.score !== undefined && body.score !== null) {
    const score = Number(body.score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      throw new AppError("score must be a number between 0 and 100", 400);
    }
  }
}

async function listLeads(query) {
  const [result, stats] = await Promise.all([
    Lead.list({
      page: query.page,
      limit: query.limit,
    }),
    Lead.getStats(),
  ]);
  return { ...result, stats };
}

async function getLead(id) {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw new AppError("Lead not found", 404);
  }
  return lead;
}

async function createLead(body) {
  validatePayload(body);
  if (body.dealershipId) {
    const dealership = await Dealership.findById(body.dealershipId);
    if (!dealership) throw new AppError("Dealership not found", 404);
  }
  if (body.salespersonId) {
    const user = await User.findById(body.salespersonId);
    if (!user) throw new AppError("Salesperson not found", 404);
  }
  return Lead.create({
    ...body,
    customerName: String(body.customerName).trim(),
    score: body.score !== undefined ? Number(body.score) : 0,
  });
}

async function updateLead(id, body) {
  const current = await getLead(id);
  validatePayload({ ...current, ...body });
  if (body.dealershipId) {
    const dealership = await Dealership.findById(body.dealershipId);
    if (!dealership) throw new AppError("Dealership not found", 404);
  }
  if (body.salespersonId) {
    const user = await User.findById(body.salespersonId);
    if (!user) throw new AppError("Salesperson not found", 404);
  }
  return Lead.update(id, {
    customerName: body.customerName !== undefined ? String(body.customerName).trim() : current.customerName,
    customerPhone: body.customerPhone !== undefined ? body.customerPhone : current.customerPhone,
    customerEmail: body.customerEmail !== undefined ? body.customerEmail : current.customerEmail,
    vehicle: body.vehicle !== undefined ? body.vehicle : current.vehicle,
    budget: body.budget !== undefined ? body.budget : current.budget,
    timeline: body.timeline !== undefined ? body.timeline : current.timeline,
    location: body.location !== undefined ? body.location : current.location,
    financing: body.financing !== undefined ? body.financing : current.financing,
    score: body.score !== undefined ? Number(body.score) : current.score,
    tier: body.tier !== undefined ? body.tier : current.tier,
    status: body.status !== undefined ? body.status : current.status,
    dealershipId: body.dealershipId !== undefined ? body.dealershipId : current.dealershipId,
    salespersonId: body.salespersonId !== undefined ? body.salespersonId : current.salespersonId,
    source: body.source !== undefined ? body.source : current.source,
    pipeline: body.pipeline !== undefined ? body.pipeline : current.pipeline,
    notes: body.notes !== undefined ? body.notes : current.notes,
  });
}

async function setLeadStatus(id, status) {
  await getLead(id);
  if (!LEAD_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${LEAD_STATUSES.join(", ")}`, 400);
  }
  return Lead.updateStatus(id, status);
}

async function assignSalesperson(id, salespersonId) {
  await getLead(id);
  if (salespersonId) {
    const user = await User.findById(salespersonId);
    if (!user) throw new AppError("Salesperson not found", 404);
  }
  return Lead.assignSalesperson(id, salespersonId || null);
}

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  setLeadStatus,
  assignSalesperson,
};
