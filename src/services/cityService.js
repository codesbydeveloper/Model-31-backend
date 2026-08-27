const City = require("../models/City");
const AppError = require("../utils/AppError");
const {
  CITY_STATUSES,
  CITY_PRIMARY_LANGUAGES,
  CITY_FINANCING_FOCUS,
} = require("../utils/constants");

function validatePayload(body) {
  if (!body.name || String(body.name).trim() === "") {
    throw new AppError("City is required", 400);
  }
  if (!body.state || String(body.state).trim() === "") {
    throw new AppError("State is required", 400);
  }
  if (body.status && !CITY_STATUSES.includes(body.status)) {
    throw new AppError("status must be Active or Inactive", 400);
  }
  if (body.primaryLanguage && !CITY_PRIMARY_LANGUAGES.includes(body.primaryLanguage)) {
    throw new AppError(
      `primaryLanguage must be one of: ${CITY_PRIMARY_LANGUAGES.join(", ")}`,
      400
    );
  }
  if (body.financingFocus && !CITY_FINANCING_FOCUS.includes(body.financingFocus)) {
    throw new AppError(
      `financingFocus must be one of: ${CITY_FINANCING_FOCUS.join(", ")}`,
      400
    );
  }
}

async function listCities(query) {
  return City.list({
    search: query.search || "",
    status: query.status || "",
    page: query.page,
    limit: query.limit,
  });
}

async function getCity(id) {
  const city = await City.findById(id);
  if (!city) {
    throw new AppError("City not found", 404);
  }
  return city;
}

async function createCity(body) {
  validatePayload(body);
  const name = String(body.name).trim();
  const state = String(body.state).trim();
  const existing = await City.findByNameAndState(name, state);
  if (existing) {
    throw new AppError("City already exists for this state", 409);
  }
  return City.create({
    ...body,
    name,
    state,
    country: body.country ? String(body.country).trim() : "USA",
    primaryLanguage: body.primaryLanguage || "English",
    secondaryLanguage: body.secondaryLanguage
      ? String(body.secondaryLanguage).trim()
      : "",
    regionalTone: body.regionalTone
      ? String(body.regionalTone).trim()
      : "Professional",
    inventoryFocus: body.inventoryFocus
      ? String(body.inventoryFocus).trim()
      : "",
    financingFocus: body.financingFocus || "Financing",
    status: body.status || "Active",
  });
}

async function updateCity(id, body) {
  const current = await getCity(id);
  validatePayload({ ...current, ...body });

  const name = body.name !== undefined ? String(body.name).trim() : current.name;
  const state = body.state !== undefined ? String(body.state).trim() : current.state;

  const existing = await City.findByNameAndState(name, state);
  if (existing && existing.id !== id) {
    throw new AppError("City already exists for this state", 409);
  }

  return City.update(id, {
    name,
    state,
    country: body.country !== undefined ? String(body.country).trim() : current.country,
    primaryLanguage:
      body.primaryLanguage !== undefined ? body.primaryLanguage : current.primaryLanguage,
    secondaryLanguage:
      body.secondaryLanguage !== undefined
        ? String(body.secondaryLanguage).trim()
        : current.secondaryLanguage,
    regionalTone:
      body.regionalTone !== undefined
        ? String(body.regionalTone).trim()
        : current.regionalTone,
    inventoryFocus:
      body.inventoryFocus !== undefined
        ? String(body.inventoryFocus).trim()
        : current.inventoryFocus,
    financingFocus:
      body.financingFocus !== undefined ? body.financingFocus : current.financingFocus,
    status: body.status !== undefined ? body.status : current.status,
  });
}

async function deleteCity(id) {
  await getCity(id);
  await City.remove(id);
  return { id };
}

module.exports = {
  listCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
};
