const svc = require("../services/systemControlsService");
const { success } = require("../utils/response");
const AppError = require("../utils/AppError");

async function overview(req, res, next) {
  try {
    return success(res, svc.getOverview());
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    return success(res, svc.updateControls(req.body));
  } catch (err) {
    next(err);
  }
}

async function patchNuclearMode(req, res, next) {
  try {
    const enabled = svc.parseBool(
      req.body.enabled !== undefined ? req.body.enabled : req.body.status
    );
    if (enabled === null) {
      throw new AppError("enabled must be true/false or ON/OFF", 400);
    }
    return success(res, svc.setNuclearMode(enabled));
  } catch (err) {
    next(err);
  }
}

async function patchToggle(req, res, next) {
  try {
    const enabled = svc.parseBool(
      req.body.enabled !== undefined ? req.body.enabled : req.body.status
    );
    if (enabled === null) {
      throw new AppError("enabled must be true/false or ON/OFF", 400);
    }
    return success(res, svc.updateToggle(req.params.key, enabled));
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, update, patchNuclearMode, patchToggle };
