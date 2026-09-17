const svc = require("../services/superAdminDashboardService");
const { success } = require("../utils/response");
const AppError = require("../utils/AppError");

async function kpis(req, res, next) {
  try {
    return success(res, { kpis: svc.getKpis() });
  } catch (err) {
    next(err);
  }
}

async function getNuclearMode(req, res, next) {
  try {
    return success(res, { nuclearMode: svc.getNuclearMode() });
  } catch (err) {
    next(err);
  }
}

async function patchNuclearMode(req, res, next) {
  try {
    if (req.body.enabled === undefined) {
      throw new AppError("enabled is required", 400);
    }
    const enabled =
      req.body.enabled === true ||
      req.body.enabled === "true" ||
      req.body.enabled === 1 ||
      req.body.enabled === "1";
    const nuclearMode = svc.setNuclearMode(enabled);
    return success(res, { message: "Nuclear mode updated", nuclearMode });
  } catch (err) {
    next(err);
  }
}

async function buyerGenome(req, res, next) {
  try {
    return success(res, svc.getBuyerGenome());
  } catch (err) {
    next(err);
  }
}

async function dealsReady(req, res, next) {
  try {
    return success(res, svc.getDealsReady());
  } catch (err) {
    next(err);
  }
}

async function managerHandoffs(req, res, next) {
  try {
    return success(res, svc.getManagerHandoffs());
  } catch (err) {
    next(err);
  }
}

async function negotiationControls(req, res, next) {
  try {
    return success(res, { negotiationControls: svc.getNegotiationControls() });
  } catch (err) {
    next(err);
  }
}

async function buyOnlineReadiness(req, res, next) {
  try {
    return success(res, { buyOnlineReadiness: svc.getBuyOnlineReadiness() });
  } catch (err) {
    next(err);
  }
}

async function listLeads(req, res, next) {
  try {
    return success(res, svc.listUnifiedLeads(req.query));
  } catch (err) {
    next(err);
  }
}

async function getLead(req, res, next) {
  try {
    return success(res, svc.getLeadDetail(req.params.leadId));
  } catch (err) {
    next(err);
  }
}

async function fingerprint(req, res, next) {
  try {
    return success(res, svc.getFingerprint(req.params.leadId));
  } catch (err) {
    next(err);
  }
}

async function dispatchMap(req, res, next) {
  try {
    return success(res, { dispatchMap: svc.getDispatchMap() });
  } catch (err) {
    next(err);
  }
}

async function smartInbox(req, res, next) {
  try {
    return success(res, svc.getSmartInbox());
  } catch (err) {
    next(err);
  }
}

async function rooftopPerformance(req, res, next) {
  try {
    return success(res, { rooftopPerformance: svc.getRooftopPerformance() });
  } catch (err) {
    next(err);
  }
}

async function activityFeed(req, res, next) {
  try {
    return success(res, svc.getActivityFeed());
  } catch (err) {
    next(err);
  }
}

async function socialEngine(req, res, next) {
  try {
    return success(res, { socialEngine: svc.getSocialEngine() });
  } catch (err) {
    next(err);
  }
}

async function leadWorkflow(req, res, next) {
  try {
    return success(res, { leadWorkflow: svc.getLeadWorkflow() });
  } catch (err) {
    next(err);
  }
}

async function crmSync(req, res, next) {
  try {
    return success(res, { crmSync: svc.getCrmSync() });
  } catch (err) {
    next(err);
  }
}

async function oemReporting(req, res, next) {
  try {
    return success(res, { oemReporting: svc.getOemReporting(req.query) });
  } catch (err) {
    next(err);
  }
}

async function oemExport(req, res, next) {
  try {
    const exported = svc.exportOemReporting(req.query);
    if (exported.format === "csv") {
      res.setHeader("Content-Type", exported.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exported.filename}"`
      );
      return res.status(200).send(exported.content);
    }
    return success(res, {
      filename: exported.filename,
      oemReporting: exported.content,
    });
  } catch (err) {
    next(err);
  }
}

async function underwaterRescue(req, res, next) {
  try {
    return success(res, { underwaterRescue: svc.getUnderwaterRescue() });
  } catch (err) {
    next(err);
  }
}

async function rescueActivity(req, res, next) {
  try {
    return success(res, svc.listRescueActivity(req.query));
  } catch (err) {
    next(err);
  }
}

async function rescueFingerprint(req, res, next) {
  try {
    return success(res, svc.getRescueFingerprint(req.params.activityId));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  kpis,
  getNuclearMode,
  patchNuclearMode,
  buyerGenome,
  dealsReady,
  managerHandoffs,
  negotiationControls,
  buyOnlineReadiness,
  listLeads,
  getLead,
  fingerprint,
  dispatchMap,
  smartInbox,
  rooftopPerformance,
  activityFeed,
  socialEngine,
  leadWorkflow,
  crmSync,
  oemReporting,
  oemExport,
  underwaterRescue,
  rescueActivity,
  rescueFingerprint,
};
