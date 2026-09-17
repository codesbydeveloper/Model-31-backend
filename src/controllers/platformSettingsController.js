const svc = require("../services/platformSettingsService");
const { success } = require("../utils/response");

async function getSettings(req, res, next) {
  try {
    return success(res, svc.getOverview());
  } catch (err) {
    next(err);
  }
}

async function saveSettings(req, res, next) {
  try {
    return success(res, svc.saveSettings(req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { getSettings, saveSettings };
