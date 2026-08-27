const NegotiationTemplate = require("../models/NegotiationTemplate");
const AppError = require("../utils/AppError");
const {
  TEMPLATE_STATUSES,
  TEMPLATE_VEHICLE_TYPES,
} = require("../utils/constants");

function normalizeStatus(status) {
  if (!status) return "ACTIVE";
  return String(status).toUpperCase();
}

function validatePayload(body) {
  if (!body.name || String(body.name).trim() === "") {
    throw new AppError("Template name is required", 400);
  }
  if (body.vehicleType && !TEMPLATE_VEHICLE_TYPES.includes(body.vehicleType)) {
    throw new AppError(
      `vehicleType must be one of: ${TEMPLATE_VEHICLE_TYPES.join(", ")}`,
      400
    );
  }
  if (body.status) {
    const status = normalizeStatus(body.status);
    if (!TEMPLATE_STATUSES.includes(status)) {
      throw new AppError("status must be ACTIVE or INACTIVE", 400);
    }
  }
}

async function listTemplates(query) {
  return NegotiationTemplate.list({
    search: query.search || "",
    status: query.status || "",
    page: query.page,
    limit: query.limit,
  });
}

async function getTemplate(id) {
  const template = await NegotiationTemplate.findById(id);
  if (!template) {
    throw new AppError("Negotiation template not found", 404);
  }
  return template;
}

async function createTemplate(body) {
  validatePayload(body);
  const name = String(body.name).trim();
  const existing = await NegotiationTemplate.findByName(name);
  if (existing) {
    throw new AppError("Template name already exists", 409);
  }

  return NegotiationTemplate.create({
    name,
    description: body.description ? String(body.description).trim() : "",
    vehicleType: body.vehicleType || "New",
    status: normalizeStatus(body.status || "ACTIVE"),
    minPriceRule: body.minPriceRule ? String(body.minPriceRule).trim() : "",
    maxDiscountRule: body.maxDiscountRule
      ? String(body.maxDiscountRule).trim()
      : "",
    paymentRange: body.paymentRange ? String(body.paymentRange).trim() : "",
    tradeRange: body.tradeRange ? String(body.tradeRange).trim() : "",
    allowedIncentives: body.allowedIncentives
      ? String(body.allowedIncentives).trim()
      : "",
    allowedFees: body.allowedFees ? String(body.allowedFees).trim() : "",
    vehicleCount: body.vehicleCount ?? 0,
  });
}

async function updateTemplate(id, body) {
  const current = await getTemplate(id);
  validatePayload({ ...current, ...body });

  const name = body.name !== undefined ? String(body.name).trim() : current.name;
  const existing = await NegotiationTemplate.findByName(name);
  if (existing && existing.id !== id) {
    throw new AppError("Template name already exists", 409);
  }

  return NegotiationTemplate.update(id, {
    name,
    description:
      body.description !== undefined
        ? String(body.description).trim()
        : current.description,
    vehicleType:
      body.vehicleType !== undefined ? body.vehicleType : current.vehicleType,
    status:
      body.status !== undefined
        ? normalizeStatus(body.status)
        : current.status,
    minPriceRule:
      body.minPriceRule !== undefined
        ? String(body.minPriceRule).trim()
        : current.minPriceRule,
    maxDiscountRule:
      body.maxDiscountRule !== undefined
        ? String(body.maxDiscountRule).trim()
        : current.maxDiscountRule,
    paymentRange:
      body.paymentRange !== undefined
        ? String(body.paymentRange).trim()
        : current.paymentRange,
    tradeRange:
      body.tradeRange !== undefined
        ? String(body.tradeRange).trim()
        : current.tradeRange,
    allowedIncentives:
      body.allowedIncentives !== undefined
        ? String(body.allowedIncentives).trim()
        : current.allowedIncentives,
    allowedFees:
      body.allowedFees !== undefined
        ? String(body.allowedFees).trim()
        : current.allowedFees,
    vehicleCount:
      body.vehicleCount !== undefined ? body.vehicleCount : current.vehicleCount,
  });
}

async function duplicateTemplate(id) {
  const current = await getTemplate(id);
  let baseName = `${current.name} Copy`;
  let name = baseName;
  let counter = 2;

  while (await NegotiationTemplate.findByName(name)) {
    name = `${baseName} ${counter}`;
    counter += 1;
  }

  return NegotiationTemplate.create({
    name,
    description: current.description,
    vehicleType: current.vehicleType,
    status: "ACTIVE",
    minPriceRule: current.minPriceRule,
    maxDiscountRule: current.maxDiscountRule,
    paymentRange: current.paymentRange,
    tradeRange: current.tradeRange,
    allowedIncentives: current.allowedIncentives,
    allowedFees: current.allowedFees,
    vehicleCount: 0,
  });
}

async function setTemplateStatus(id, status) {
  await getTemplate(id);
  const normalized = normalizeStatus(status);
  if (!TEMPLATE_STATUSES.includes(normalized)) {
    throw new AppError("status must be ACTIVE or INACTIVE", 400);
  }
  return NegotiationTemplate.updateStatus(id, normalized);
}

async function deleteTemplate(id) {
  await getTemplate(id);
  await NegotiationTemplate.remove(id);
  return { id };
}

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  setTemplateStatus,
  deleteTemplate,
};
