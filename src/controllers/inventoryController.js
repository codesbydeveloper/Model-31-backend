const svc = require("../services/inventoryService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, await svc.listVehicles(req.query));
  } catch (err) {
    console.error("Super admin inventory list failed:", err);
    if (err.statusCode) return next(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Something went wrong",
    });
  }
}

async function create(req, res, next) {
  try {
    return success(res, await svc.createVehicle(req.body, req.files), 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    return success(res, await svc.updateVehicle(req.params.vehicleId, req.body, req.files));
  } catch (err) {
    next(err);
  }
}

async function removeImage(req, res, next) {
  try {
    return success(
      res,
      await svc.deleteVehicleImage(req.params.vehicleId, req.params.imageId)
    );
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    return success(res, await svc.deleteVehicle(req.params.vehicleId));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, await svc.getVehicleDetail(req.params.vehicleId));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, removeImage, remove, getOne };
