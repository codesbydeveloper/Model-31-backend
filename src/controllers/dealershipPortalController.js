const dealershipPortalService = require("../services/dealershipPortalService");
const { success } = require("../utils/response");

async function listLeads(req, res, next) {
  try {
    const data = await dealershipPortalService.listLeads(req.dealershipId, req.query);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getLead(req, res, next) {
  try {
    const lead = await dealershipPortalService.getLead(req.dealershipId, req.params.id);
    return success(res, { lead });
  } catch (err) {
    next(err);
  }
}

async function setLeadStatus(req, res, next) {
  try {
    const lead = await dealershipPortalService.setLeadStatus(
      req.dealershipId,
      req.params.id,
      req.body.status
    );
    return success(res, { message: "Lead status updated", lead });
  } catch (err) {
    next(err);
  }
}

async function assignLead(req, res, next) {
  try {
    const lead = await dealershipPortalService.assignLead(
      req.dealershipId,
      req.params.id,
      req.body.salespersonId
    );
    return success(res, { message: "Salesperson assigned", lead });
  } catch (err) {
    next(err);
  }
}

async function listConversations(req, res, next) {
  try {
    const data = await dealershipPortalService.listConversations(req.dealershipId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const data = await dealershipPortalService.getConversation(
      req.dealershipId,
      req.params.leadId
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const message = await dealershipPortalService.sendMessage(
      req.dealershipId,
      req.params.leadId,
      req.body
    );
    return success(res, { message: "Message sent", data: message }, 201);
  } catch (err) {
    next(err);
  }
}

async function listSalespeople(req, res, next) {
  try {
    const data = await dealershipPortalService.listSalespeople(
      req.dealershipId,
      req.query
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function listSocialAccounts(req, res, next) {
  try {
    const data = await dealershipPortalService.listSocialAccounts(req.dealershipId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function updateSocialAccount(req, res, next) {
  try {
    const account = await dealershipPortalService.updateSocialAccount(
      req.dealershipId,
      req.params.id,
      req.body
    );
    return success(res, { message: "Social account updated", account });
  } catch (err) {
    next(err);
  }
}

async function disconnectSocialAccount(req, res, next) {
  try {
    const account = await dealershipPortalService.disconnectSocialAccount(
      req.dealershipId,
      req.params.id
    );
    return success(res, { message: "Social account disconnected", account });
  } catch (err) {
    next(err);
  }
}

async function getCrm(req, res, next) {
  try {
    const data = await dealershipPortalService.getCrm(req.dealershipId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function syncCrm(req, res, next) {
  try {
    const data = await dealershipPortalService.syncCrm(req.dealershipId);
    return success(res, { message: "CRM sync started", ...data });
  } catch (err) {
    next(err);
  }
}

async function listAiContent(req, res, next) {
  try {
    const data = await dealershipPortalService.listAiContent(req.dealershipId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAiContent(req, res, next) {
  try {
    const data = await dealershipPortalService.getAiContent(
      req.dealershipId,
      req.params.id
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getReports(req, res, next) {
  try {
    const data = await dealershipPortalService.getReportsSummary(req.dealershipId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getSettings(req, res, next) {
  try {
    const data = await dealershipPortalService.getSettings(req.dealershipId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function saveSettings(req, res, next) {
  try {
    const data = await dealershipPortalService.saveSettings(
      req.dealershipId,
      req.body
    );
    return success(res, { message: "Settings saved", ...data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLeads,
  getLead,
  setLeadStatus,
  assignLead,
  listConversations,
  getConversation,
  sendMessage,
  listSalespeople,
  listSocialAccounts,
  updateSocialAccount,
  disconnectSocialAccount,
  getCrm,
  syncCrm,
  listAiContent,
  getAiContent,
  getReports,
  getSettings,
  saveSettings,
};
