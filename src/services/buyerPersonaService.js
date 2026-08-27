const BuyerPersona = require("../models/BuyerPersona");
const AppError = require("../utils/AppError");
const {
  PERSONA_STATUSES,
  PERSONA_LANGUAGES,
} = require("../utils/constants");

function validatePayload(body) {
  if (!body.name || String(body.name).trim() === "") {
    throw new AppError("Persona name is required", 400);
  }
  if (body.status && !PERSONA_STATUSES.includes(body.status)) {
    throw new AppError("status must be Active or Inactive", 400);
  }
  if (body.language && !PERSONA_LANGUAGES.includes(body.language)) {
    throw new AppError(
      `language must be one of: ${PERSONA_LANGUAGES.join(", ")}`,
      400
    );
  }

  const minBudget =
    body.minBudget !== undefined && body.minBudget !== null && body.minBudget !== ""
      ? Number(body.minBudget)
      : undefined;
  const maxBudget =
    body.maxBudget !== undefined && body.maxBudget !== null && body.maxBudget !== ""
      ? Number(body.maxBudget)
      : undefined;

  if (minBudget !== undefined && (Number.isNaN(minBudget) || minBudget < 0)) {
    throw new AppError("Minimum budget must be a number >= 0", 400);
  }
  if (maxBudget !== undefined && (Number.isNaN(maxBudget) || maxBudget < 0)) {
    throw new AppError("Maximum budget must be a number >= 0", 400);
  }
  if (
    minBudget !== undefined &&
    maxBudget !== undefined &&
    maxBudget < minBudget
  ) {
    throw new AppError("Maximum budget must be greater than or equal to minimum budget", 400);
  }
}

async function listPersonas(query) {
  return BuyerPersona.list({
    search: query.search || "",
    page: query.page,
    limit: query.limit,
  });
}

async function getPersona(id) {
  const persona = await BuyerPersona.findById(id);
  if (!persona) {
    throw new AppError("Buyer persona not found", 404);
  }
  return persona;
}

async function createPersona(body) {
  validatePayload(body);
  const name = String(body.name).trim();
  const existing = await BuyerPersona.findByName(name);
  if (existing) {
    throw new AppError("Persona name already exists", 409);
  }
  return BuyerPersona.create({
    name,
    description: body.description ? String(body.description).trim() : "",
    minBudget: body.minBudget !== undefined && body.minBudget !== "" ? Number(body.minBudget) : 0,
    maxBudget: body.maxBudget !== undefined && body.maxBudget !== "" ? Number(body.maxBudget) : 0,
    vehiclePreference: body.vehiclePreference
      ? String(body.vehiclePreference).trim()
      : "",
    buyingTimeline: body.buyingTimeline ? String(body.buyingTimeline).trim() : "",
    financingPreference: body.financingPreference
      ? String(body.financingPreference).trim()
      : "",
    language: body.language || "English",
    status: body.status || "Active",
  });
}

async function updatePersona(id, body) {
  const current = await getPersona(id);
  validatePayload({ ...current, ...body });

  const name = body.name !== undefined ? String(body.name).trim() : current.name;
  const existing = await BuyerPersona.findByName(name);
  if (existing && existing.id !== id) {
    throw new AppError("Persona name already exists", 409);
  }

  return BuyerPersona.update(id, {
    name,
    description:
      body.description !== undefined
        ? String(body.description).trim()
        : current.description,
    minBudget:
      body.minBudget !== undefined && body.minBudget !== ""
        ? Number(body.minBudget)
        : current.minBudget,
    maxBudget:
      body.maxBudget !== undefined && body.maxBudget !== ""
        ? Number(body.maxBudget)
        : current.maxBudget,
    vehiclePreference:
      body.vehiclePreference !== undefined
        ? String(body.vehiclePreference).trim()
        : current.vehiclePreference,
    buyingTimeline:
      body.buyingTimeline !== undefined
        ? String(body.buyingTimeline).trim()
        : current.buyingTimeline,
    financingPreference:
      body.financingPreference !== undefined
        ? String(body.financingPreference).trim()
        : current.financingPreference,
    language: body.language !== undefined ? body.language : current.language,
    status: body.status !== undefined ? body.status : current.status,
  });
}

async function deletePersona(id) {
  await getPersona(id);
  await BuyerPersona.remove(id);
  return { id };
}

module.exports = {
  listPersonas,
  getPersona,
  createPersona,
  updatePersona,
  deletePersona,
};
