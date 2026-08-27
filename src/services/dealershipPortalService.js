const Lead = require("../models/Lead");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const SocialAccount = require("../models/SocialAccount");
const DealershipCrm = require("../models/DealershipCrm");
const AiContent = require("../models/AiContent");
const DealershipSettings = require("../models/DealershipSettings");
const Dealership = require("../models/Dealership");
const pool = require("../config/database");
const AppError = require("../utils/AppError");
const { LEAD_STATUSES } = require("../utils/constants");

async function getDealershipContext(dealershipId) {
  const dealership = await Dealership.findById(dealershipId);
  if (!dealership) throw new AppError("Dealership not found", 404);
  return dealership;
}

async function assertLeadInDealership(leadId, dealershipId) {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.dealershipId !== dealershipId) {
    throw new AppError("Lead not found", 404);
  }
  return lead;
}

async function listLeads(dealershipId, query) {
  await getDealershipContext(dealershipId);
  const [result, stats] = await Promise.all([
    Lead.list({
      dealershipId,
      search: query.search || "",
      page: query.page,
      limit: query.limit,
    }),
    Lead.getStats(dealershipId),
  ]);
  return { ...result, stats };
}

async function getLead(dealershipId, leadId) {
  return assertLeadInDealership(leadId, dealershipId);
}

async function setLeadStatus(dealershipId, leadId, status) {
  await assertLeadInDealership(leadId, dealershipId);
  if (!LEAD_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${LEAD_STATUSES.join(", ")}`, 400);
  }
  return Lead.updateStatus(leadId, status);
}

async function assignLead(dealershipId, leadId, salespersonId) {
  await assertLeadInDealership(leadId, dealershipId);
  if (salespersonId) {
    const user = await User.findById(salespersonId);
    if (!user || user.dealershipId !== dealershipId || user.role !== "Salesperson") {
      throw new AppError("Salesperson not found in this dealership", 404);
    }
  }
  return Lead.assignSalesperson(leadId, salespersonId || null);
}

async function listConversations(dealershipId) {
  await getDealershipContext(dealershipId);
  const conversations = await Conversation.listConversationLeads(dealershipId);
  return { conversations };
}

async function getConversation(dealershipId, leadId) {
  const lead = await assertLeadInDealership(leadId, dealershipId);
  const messages = await Conversation.listByLead(leadId);
  return { lead, messages };
}

async function sendMessage(dealershipId, leadId, body) {
  await assertLeadInDealership(leadId, dealershipId);
  if (!body.message || String(body.message).trim() === "") {
    throw new AppError("message is required", 400);
  }
  const senderType = body.senderType || "AI";
  if (!["CUSTOMER", "AI", "STAFF"].includes(senderType)) {
    throw new AppError("senderType must be CUSTOMER, AI, or STAFF", 400);
  }
  const message = await Conversation.createMessage({
    leadId,
    senderType,
    message: String(body.message).trim(),
  });
  return message;
}

async function listSalespeople(dealershipId, query) {
  await getDealershipContext(dealershipId);
  const result = await User.listSalespeopleByDealership(dealershipId, {
    page: query.page,
    limit: query.limit,
  });

  const salespeople = [];
  for (const user of result.users) {
    const [assignedRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads WHERE dealership_id = ? AND salesperson_id = ?`,
      [dealershipId, user.id]
    );
    const [soldRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM leads
       WHERE dealership_id = ? AND salesperson_id = ? AND status = 'CLOSED'`,
      [dealershipId, user.id]
    );
    salespeople.push({
      id: user.id,
      name: user.name,
      email: user.email,
      presence: user.presence || "OFFLINE",
      assigned: Number(assignedRows[0]?.total) || 0,
      sold: Number(soldRows[0]?.total) || 0,
      status: user.status,
    });
  }

  return { salespeople, pagination: result.pagination };
}

async function listSocialAccounts(dealershipId) {
  await getDealershipContext(dealershipId);
  const accounts = await SocialAccount.listByDealership(dealershipId);
  return { accounts };
}

async function updateSocialAccount(dealershipId, id, body) {
  const account = await SocialAccount.findById(id);
  if (!account || account.dealershipId !== dealershipId) {
    throw new AppError("Social account not found", 404);
  }
  return SocialAccount.update(id, {
    accountName: body.accountName !== undefined ? body.accountName : account.accountName,
    ownerName: body.ownerName !== undefined ? body.ownerName : account.ownerName,
    model31Source:
      body.model31Source !== undefined ? body.model31Source : account.model31Source,
    status: body.status !== undefined ? body.status : account.status,
  });
}

async function disconnectSocialAccount(dealershipId, id) {
  const account = await SocialAccount.findById(id);
  if (!account || account.dealershipId !== dealershipId) {
    throw new AppError("Social account not found", 404);
  }
  return SocialAccount.disconnect(id);
}

async function getCrm(dealershipId) {
  await getDealershipContext(dealershipId);
  const crm = await DealershipCrm.ensureDefault(dealershipId);
  return { crm };
}

async function syncCrm(dealershipId) {
  await getDealershipContext(dealershipId);
  const crm = await DealershipCrm.syncNow(dealershipId);
  return { crm };
}

async function listAiContent(dealershipId) {
  await getDealershipContext(dealershipId);
  const items = await AiContent.listByDealership(dealershipId);
  return { items };
}

async function getAiContent(dealershipId, id) {
  const item = await AiContent.findById(id);
  if (!item || item.dealershipId !== dealershipId) {
    throw new AppError("AI content not found", 404);
  }
  return { item };
}

async function getReportsSummary(dealershipId) {
  await getDealershipContext(dealershipId);
  const stats = await Lead.getStats(dealershipId);
  const qualified = stats.qualified + stats.contacted + stats.appointment;
  const sold = stats.closed;
  const leads = stats.total;
  const appointments = stats.appointment;
  const conversionRate = leads === 0 ? 0 : Number(((sold / leads) * 100).toFixed(2));

  return {
    summary: {
      leads,
      qualified,
      appointments,
      sold,
      revenue: sold * 47500,
      conversionRate,
    },
  };
}

async function getSettings(dealershipId) {
  await getDealershipContext(dealershipId);
  const settings = await DealershipSettings.ensureDefault(dealershipId);
  return { settings };
}

async function saveSettings(dealershipId, body) {
  await getDealershipContext(dealershipId);
  const settings = await DealershipSettings.save(dealershipId, {
    leadAlerts: body.leadAlerts !== undefined ? Boolean(body.leadAlerts) : true,
    crmAutoSync: body.crmAutoSync !== undefined ? Boolean(body.crmAutoSync) : true,
    appointmentReminders:
      body.appointmentReminders !== undefined ? Boolean(body.appointmentReminders) : true,
    afterHoursRouting:
      body.afterHoursRouting !== undefined ? Boolean(body.afterHoursRouting) : false,
  });
  return { settings };
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
  getReportsSummary,
  getSettings,
  saveSettings,
};
