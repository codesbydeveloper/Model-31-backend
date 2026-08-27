const bdcPortalService = require("../services/bdcPortalService");
const { success } = require("../utils/response");

async function listQualifiedLeads(req, res, next) {
  try {
    const data = await bdcPortalService.listQualifiedLeads(req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getLead(req, res, next) {
  try {
    const lead = await bdcPortalService.getLead(req.params.id);
    return success(res, { lead });
  } catch (err) {
    next(err);
  }
}

async function listQueue(req, res, next) {
  try {
    const data = await bdcPortalService.listQueue(req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function listSalespeople(req, res, next) {
  try {
    const data = await bdcPortalService.listAvailableSalespeople();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function assignLead(req, res, next) {
  try {
    const lead = await bdcPortalService.assignLead(
      req.params.id,
      req.body.salespersonId
    );
    return success(res, { message: "Lead assigned successfully", lead });
  } catch (err) {
    next(err);
  }
}

async function reassignLead(req, res, next) {
  try {
    const lead = await bdcPortalService.reassignLead(
      req.params.id,
      req.body.salespersonId
    );
    return success(res, { message: "Lead reassigned successfully", lead });
  } catch (err) {
    next(err);
  }
}

async function escalateLead(req, res, next) {
  try {
    const lead = await bdcPortalService.escalateLead(req.params.id, req.body);
    return success(res, { message: "Lead escalated", lead });
  } catch (err) {
    next(err);
  }
}

async function listConversations(req, res, next) {
  try {
    const data = await bdcPortalService.listConversations();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const data = await bdcPortalService.getConversation(req.params.leadId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const message = await bdcPortalService.sendMessage(
      req.params.leadId,
      req.body
    );
    return success(res, { message: "Message sent", data: message }, 201);
  } catch (err) {
    next(err);
  }
}

async function getSla(req, res, next) {
  try {
    const data = await bdcPortalService.getSlaMonitoring();
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getTeam(req, res, next) {
  try {
    const data = await bdcPortalService.getTeamPerformance(req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function listEscalations(req, res, next) {
  try {
    const data = await bdcPortalService.listEscalations(req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function resolveEscalation(req, res, next) {
  try {
    const lead = await bdcPortalService.resolveEscalation(req.params.id);
    return success(res, { message: "Escalation resolved", lead });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listQualifiedLeads,
  getLead,
  listQueue,
  listSalespeople,
  assignLead,
  reassignLead,
  escalateLead,
  listConversations,
  getConversation,
  sendMessage,
  getSla,
  getTeam,
  listEscalations,
  resolveEscalation,
};
