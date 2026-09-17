const svc = require("../services/integrationHealthService");
const { success } = require("../utils/response");

async function overview(req, res, next) {
  try {
    return success(res, svc.getOverview());
  } catch (err) {
    next(err);
  }
}

async function runHealthCheck(req, res, next) {
  try {
    return success(res, svc.runHealthCheck());
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, runHealthCheck };
