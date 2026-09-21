const svc = require("../services/inventoryManagerService");
const { success } = require("../utils/response");

async function dashboard(req, res, next) {
  try {
    return success(res, await svc.getDashboard(req.dealershipId));
  } catch (err) {
    next(err);
  }
}

async function listInventory(req, res, next) {
  try {
    return success(res, await svc.listInventory(req.dealershipId, req.query));
  } catch (err) {
    next(err);
  }
}

async function listNeedsPhotos(req, res, next) {
  try {
    return success(res, await svc.listNeedsPhotos(req.dealershipId, req.query));
  } catch (err) {
    next(err);
  }
}

async function getVehicle(req, res, next) {
  try {
    return success(res, await svc.getVehicle(req.dealershipId, req.params.id));
  } catch (err) {
    next(err);
  }
}

async function createVehicle(req, res, next) {
  try {
    return success(res, await svc.createVehicle(req.dealershipId, req.body), 201);
  } catch (err) {
    next(err);
  }
}

async function updateVehicle(req, res, next) {
  try {
    return success(
      res,
      await svc.updateVehicle(req.dealershipId, req.params.id, req.body)
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  listInventory,
  listNeedsPhotos,
  getVehicle,
  createVehicle,
  updateVehicle,
};
