const cityService = require("../services/cityService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    const { cities, pagination } = await cityService.listCities(req.query);
    return success(res, { cities, pagination });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const city = await cityService.getCity(req.params.id);
    return success(res, { city });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const city = await cityService.createCity(req.body);
    return success(res, { message: "City created successfully", city }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const city = await cityService.updateCity(req.params.id, req.body);
    return success(res, { message: "City updated successfully", city });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await cityService.deleteCity(req.params.id);
    return success(res, { message: "City deleted successfully" });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, remove };
