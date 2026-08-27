const dealershipService = require("../services/dealershipService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    const { dealerships, pagination } = await dealershipService.listDealerships(req.query);
    return success(res, { dealerships, pagination });
  } catch (err) {
    next(err);
  }
}

async function options(req, res, next) {
  try {
    const { dealerships } = await dealershipService.listDealershipOptions();
    return success(res, { dealerships });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const dealership = await dealershipService.getDealership(req.params.id);
    return success(res, { dealership });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const dealership = await dealershipService.createDealership(req.body);
    return success(res, { message: "Dealership created successfully", dealership }, 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const dealership = await dealershipService.updateDealership(req.params.id, req.body);
    return success(res, { message: "Dealership updated successfully", dealership });
  } catch (err) {
    next(err);
  }
}

async function setStatus(req, res, next) {
  try {
    const dealership = await dealershipService.setDealershipStatus(req.params.id, req.body.status);
    return success(res, { message: "Dealership status updated", dealership });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, options, getOne, create, update, setStatus };
