const svc = require("../services/crmIntegrationsService");
const { success } = require("../utils/response");

async function overview(req, res, next) {
  try {
    return success(res, svc.getOverview());
  } catch (err) {
    next(err);
  }
}

async function syncErrors(req, res, next) {
  try {
    return success(res, svc.listSyncErrors());
  } catch (err) {
    next(err);
  }
}

async function platformActivity(req, res, next) {
  try {
    return success(res, svc.listPlatformActivity());
  } catch (err) {
    next(err);
  }
}

async function retryError(req, res, next) {
  try {
    return success(res, svc.retrySyncError(req.params.errorId));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, svc.getConnectionDetails(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    return success(res, svc.getSettings(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const data = svc.updateSettings(req.params.crmId, req.body);
    return success(res, {
      message: "CRM settings saved successfully",
      ...data,
    });
  } catch (err) {
    next(err);
  }
}

async function syncNow(req, res, next) {
  try {
    return success(res, svc.syncNow(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    return success(res, svc.disconnect(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function connectionSyncErrors(req, res, next) {
  try {
    return success(res, svc.listConnectionSyncErrors(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function fieldMapping(req, res, next) {
  try {
    return success(res, svc.getFieldMapping(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function activity(req, res, next) {
  try {
    return success(res, svc.getActivity(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

async function health(req, res, next) {
  try {
    return success(res, svc.getHealth(req.params.crmId));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  overview,
  syncErrors,
  platformActivity,
  retryError,
  getOne,
  getSettings,
  updateSettings,
  syncNow,
  disconnect,
  connectionSyncErrors,
  fieldMapping,
  activity,
  health,
};
