const svc = require("../services/socialIntegrationsService");
const { success } = require("../utils/response");

async function overview(req, res, next) {
  try {
    return success(res, await svc.getOverview());
  } catch (err) {
    next(err);
  }
}

async function getPlatformSettings(req, res, next) {
  try {
    return success(res, await svc.getPlatformSettings(req.params.platformSlug));
  } catch (err) {
    next(err);
  }
}

async function connectPlatform(req, res, next) {
  try {
    return success(res, await svc.connectPlatform(req.params.platformSlug));
  } catch (err) {
    next(err);
  }
}

async function disconnectPlatform(req, res, next) {
  try {
    return success(res, await svc.disconnectPlatform(req.params.platformSlug));
  } catch (err) {
    next(err);
  }
}

async function updateStaffAccountSource(req, res, next) {
  try {
    return success(
      res,
      await svc.updateStaffAccountSource(req.params.accountId, req.body)
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  overview,
  getPlatformSettings,
  connectPlatform,
  disconnectPlatform,
  updateStaffAccountSource,
};
