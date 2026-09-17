const svc = require("../services/analyticsService");
const { success } = require("../utils/response");

async function overview(req, res, next) {
  try {
    return success(res, svc.getOverview());
  } catch (err) {
    next(err);
  }
}

module.exports = { overview };
