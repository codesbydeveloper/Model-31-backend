const { enqueueLead, listQuarantine, listCleanLeads } = require("../services/crmHygieneService");
const { getHygieneSnapshot } = require("../services/hygieneStats");
const { getMeltPlateStatus, listMeltPlateEvents } = require("../services/crmMeltPlate");
const { success } = require("../utils/response");

function webhook(req, res) {
  const payload = req.body || {};
  if (!payload.lead_id && !payload.leadId) {
    return res.status(400).json({ error: "missing lead_id" });
  }
  enqueueLead(payload);
  return res.status(200).json({ status: "accepted" });
}

async function stats(req, res, next) {
  try {
    return success(res, { stats: getHygieneSnapshot() });
  } catch (err) {
    next(err);
  }
}

async function quarantine(req, res, next) {
  try {
    return success(res, await listQuarantine(req.query));
  } catch (err) {
    next(err);
  }
}

async function cleanLeads(req, res, next) {
  try {
    return success(res, await listCleanLeads(req.query));
  } catch (err) {
    next(err);
  }
}

async function meltPlate(req, res, next) {
  try {
    const status = getMeltPlateStatus();
    const events = await listMeltPlateEvents(req.query.limit);
    return success(res, { meltPlate: status, events });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  webhook,
  stats,
  quarantine,
  cleanLeads,
  meltPlate,
};
