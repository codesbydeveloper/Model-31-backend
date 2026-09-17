const svc = require("../services/inventoryService");
const { success } = require("../utils/response");

async function list(req, res, next) {
  try {
    return success(res, svc.listVehicles(req.query));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, svc.getVehicleDetail(req.params.vehicleId));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne };
