const salespersonPortalService = require("../services/salespersonPortalService");
const { success } = require("../utils/response");

async function dashboard(req, res, next) {
  try {
    const data = await salespersonPortalService.getDashboard(req.user);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function setPresence(req, res, next) {
  try {
    const presence = await salespersonPortalService.setPresence(
      req.user.id,
      req.body.presence
    );
    return success(res, { message: "Presence updated", presence });
  } catch (err) {
    next(err);
  }
}

async function listIncoming(req, res, next) {
  try {
    const data = await salespersonPortalService.listIncomingLeads(
      req.user.id,
      req.query
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function acceptLead(req, res, next) {
  try {
    const lead = await salespersonPortalService.acceptLead(
      req.user.id,
      req.params.id
    );
    return success(res, { message: "Lead accepted", lead });
  } catch (err) {
    next(err);
  }
}

async function declineLead(req, res, next) {
  try {
    const lead = await salespersonPortalService.declineLead(
      req.user.id,
      req.params.id
    );
    return success(res, { message: "Lead declined", lead });
  } catch (err) {
    next(err);
  }
}

async function listMyLeads(req, res, next) {
  try {
    const data = await salespersonPortalService.listMyLeads(
      req.user.id,
      req.query
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getLead(req, res, next) {
  try {
    const lead = await salespersonPortalService.getLead(
      req.user.id,
      req.params.id
    );
    return success(res, { lead });
  } catch (err) {
    next(err);
  }
}

async function setLeadStatus(req, res, next) {
  try {
    const lead = await salespersonPortalService.setLeadStatus(
      req.user.id,
      req.params.id,
      req.body.status
    );
    return success(res, { message: "Lead status updated", lead });
  } catch (err) {
    next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const note = await salespersonPortalService.addNote(
      req.user.id,
      req.params.id,
      req.body.note
    );
    return success(res, { message: "Note added", note }, 201);
  } catch (err) {
    next(err);
  }
}

async function markSold(req, res, next) {
  try {
    const data = await salespersonPortalService.markSold(
      req.user.id,
      req.params.id,
      req.body
    );
    return success(res, { message: "Lead marked sold", ...data });
  } catch (err) {
    next(err);
  }
}

async function markNotSold(req, res, next) {
  try {
    const lead = await salespersonPortalService.markNotSold(
      req.user.id,
      req.params.id
    );
    return success(res, { message: "Lead marked not sold", lead });
  } catch (err) {
    next(err);
  }
}

async function listConversations(req, res, next) {
  try {
    const data = await salespersonPortalService.listConversations(req.user.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getConversation(req, res, next) {
  try {
    const data = await salespersonPortalService.getConversation(
      req.user.id,
      req.params.leadId
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function sendMessage(req, res, next) {
  try {
    const message = await salespersonPortalService.sendMessage(
      req.user.id,
      req.params.leadId,
      req.body
    );
    return success(res, { message: "Message sent", data: message }, 201);
  } catch (err) {
    next(err);
  }
}

async function listAppointments(req, res, next) {
  try {
    const data = await salespersonPortalService.listAppointments(
      req.user.id,
      req.query
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getAppointment(req, res, next) {
  try {
    const appointment = await salespersonPortalService.getAppointment(
      req.user.id,
      req.params.id
    );
    return success(res, { appointment });
  } catch (err) {
    next(err);
  }
}

async function createAppointment(req, res, next) {
  try {
    const appointment = await salespersonPortalService.createAppointment(
      req.user,
      req.body
    );
    return success(res, { message: "Appointment scheduled", appointment }, 201);
  } catch (err) {
    next(err);
  }
}

async function listSoldDeals(req, res, next) {
  try {
    const data = await salespersonPortalService.listSoldDeals(
      req.user.id,
      req.query
    );
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getSoldDeal(req, res, next) {
  try {
    const deal = await salespersonPortalService.getSoldDeal(
      req.user.id,
      req.params.id
    );
    return success(res, { deal });
  } catch (err) {
    next(err);
  }
}

async function getCommission(req, res, next) {
  try {
    const data = await salespersonPortalService.getCommission(req.user.id);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dashboard,
  setPresence,
  listIncoming,
  acceptLead,
  declineLead,
  listMyLeads,
  getLead,
  setLeadStatus,
  addNote,
  markSold,
  markNotSold,
  listConversations,
  getConversation,
  sendMessage,
  listAppointments,
  getAppointment,
  createAppointment,
  listSoldDeals,
  getSoldDeal,
  getCommission,
};
