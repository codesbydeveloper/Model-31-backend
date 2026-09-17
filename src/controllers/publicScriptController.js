const salespersonPortalService = require("../services/salespersonPortalService");
const { success } = require("../utils/response");

async function getPublicScript(req, res, next) {
  try {
    const script = await salespersonPortalService.getPublicScript(
      req.params.token
    );
    return success(res, { script });
  } catch (err) {
    next(err);
  }
}

async function approvePublicScript(req, res, next) {
  try {
    const script = await salespersonPortalService.approvePublicScript(
      req.params.token
    );
    return success(res, { message: "Script approved", script });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPublicScript,
  approvePublicScript,
};
