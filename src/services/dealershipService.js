const Dealership = require("../models/Dealership");
const AppError = require("../utils/AppError");

const STATUSES = ["Active", "Inactive"];
const CONNECTION_STATUSES = ["Connected", "Partial", "Disconnected"];
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
];

function validatePayload(body) {
  if (!body.name || String(body.name).trim() === "") {
    throw new AppError("Dealership Name is required", 400);
  }
  if (body.status && !STATUSES.includes(body.status)) {
    throw new AppError("status must be Active or Inactive", 400);
  }
  if (body.timezone && !TIMEZONES.includes(body.timezone)) {
    throw new AppError("Invalid timezone", 400);
  }
  if (body.crmStatus && !CONNECTION_STATUSES.includes(body.crmStatus)) {
    throw new AppError("crmStatus must be Connected, Partial, or Disconnected", 400);
  }
  if (body.socialStatus && !CONNECTION_STATUSES.includes(body.socialStatus)) {
    throw new AppError("socialStatus must be Connected, Partial, or Disconnected", 400);
  }
}

async function listDealerships(query) {
  return Dealership.list({
    search: query.search || "",
    status: query.status || "",
    city: query.city || "",
    crmStatus: query.crmStatus || "",
    socialStatus: query.socialStatus || "",
    page: query.page,
    limit: query.limit,
  });
}

async function listDealershipOptions() {
  const dealerships = await Dealership.listAllOptions();
  return {
    dealerships: [
      ...dealerships,
      { id: null, name: "Unassigned" },
    ],
  };
}

async function getDealership(id) {
  const dealership = await Dealership.findById(id);
  if (!dealership) {
    throw new AppError("Dealership not found", 404);
  }
  return dealership;
}

async function createDealership(body) {
  validatePayload(body);
  const existing = await Dealership.findByName(String(body.name).trim());
  if (existing) {
    throw new AppError("Dealership name already exists", 409);
  }
  return Dealership.create({
    ...body,
    name: String(body.name).trim(),
  });
}

async function updateDealership(id, body) {
  const current = await getDealership(id);
  validatePayload({ ...current, ...body });
  return Dealership.update(id, {
    ...current,
    ...body,
    name: body.name ? String(body.name).trim() : current.name,
    brands: body.brands !== undefined ? body.brands : current.brands,
  });
}

async function setDealershipStatus(id, status) {
  await getDealership(id);
  if (!["Active", "Inactive"].includes(status)) {
    throw new AppError("status must be Active or Inactive", 400);
  }
  return Dealership.updateStatus(id, status);
}

module.exports = {
  listDealerships,
  listDealershipOptions,
  getDealership,
  createDealership,
  updateDealership,
  setDealershipStatus,
};
