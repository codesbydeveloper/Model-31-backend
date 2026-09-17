const svc = require("../services/pipelineTransparencyService");
const { success } = require("../utils/response");

async function overview(req, res, next) {
  try {
    return success(res, svc.getOverview(req.query));
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    return success(res, svc.getLeadDetail(req.params.leadId));
  } catch (err) {
    next(err);
  }
}

async function updateOne(req, res, next) {
  try {
    return success(res, svc.attemptPipelineChange(req.params.leadId, req.body));
  } catch (err) {
    next(err);
  }
}

async function classify(req, res, next) {
  try {
    return success(res, svc.classifyIncomingLead(req.body));
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, getOne, updateOne, classify };
