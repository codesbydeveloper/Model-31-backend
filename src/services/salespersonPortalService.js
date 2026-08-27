const Lead = require("../models/Lead");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Appointment = require("../models/Appointment");
const SoldDeal = require("../models/SoldDeal");
const pool = require("../config/database");
const { randomUUID } = require("crypto");
const AppError = require("../utils/AppError");
const { LEAD_STATUSES } = require("../utils/constants");

async function assertOwnLead(leadId, salespersonId) {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.salespersonId !== salespersonId) {
    throw new AppError("Lead not found", 404);
  }
  return lead;
}

async function setPresence(userId, presence) {
  const value = String(presence || "").toUpperCase();
  if (!["ONLINE", "OFFLINE", "BUSY"].includes(value)) {
    throw new AppError("presence must be ONLINE, OFFLINE, or BUSY", 400);
  }
  const user = await User.updatePresence(userId, value);
  return {
    id: user.id,
    name: user.name,
    presence: user.presence,
  };
}

async function getDashboard(user) {
  const salespersonId = user.id;
  const appointmentStats = await Appointment.getStats(salespersonId);
  const commission = await SoldDeal.getCommissionSummary(salespersonId);

  const myLeads = await Lead.list({ salespersonId, page: 1, limit: 100 });
  const accepted = myLeads.leads.filter(
    (l) => l.dispatchStatus === "ACCEPTED" || l.status === "CONTACTED"
  ).length;
  const todayLeads = myLeads.pagination.total;

  const upcoming = await Appointment.listBySalesperson(salespersonId, {
    page: 1,
    limit: 5,
  });
  const recentDeals = await SoldDeal.listBySalesperson(salespersonId, {
    page: 1,
    limit: 5,
  });

  return {
    presence: user.presence || "OFFLINE",
    dealership: user.dealershipName || "Unassigned",
    stats: {
      todaysAppointments: appointmentStats.today,
      upcoming: appointmentStats.upcoming,
      soldThisMonth: commission.currentMonthSales,
      commission: commission.currentMonthCommission,
      todaysLeads: todayLeads,
      accepted,
      declined: 0,
      appointments: appointmentStats.confirmed,
    },
    commissionSummary: {
      thisMonth: commission.currentMonthCommission,
      pending: commission.pendingCommission,
    },
    todaysAppointments: upcoming.appointments.filter((a) => {
      const today = new Date().toISOString().slice(0, 10);
      const date = a.date ? String(a.date).slice(0, 10) : "";
      return date === today;
    }),
    upcomingAppointments: upcoming.appointments,
    recentSoldDeals: recentDeals.deals,
  };
}

async function listIncomingLeads(salespersonId, query) {
  return Lead.list({
    salespersonId,
    dispatchStatus: "ASSIGNED",
    search: query.search || "",
    page: query.page,
    limit: query.limit,
  });
}

async function acceptLead(salespersonId, leadId) {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.salespersonId !== salespersonId) {
    throw new AppError("Incoming lead not found", 404);
  }
  if (lead.dispatchStatus !== "ASSIGNED") {
    throw new AppError("Lead is not waiting for acceptance", 400);
  }
  return Lead.acceptAssignment(leadId);
}

async function declineLead(salespersonId, leadId) {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.salespersonId !== salespersonId) {
    throw new AppError("Incoming lead not found", 404);
  }
  return Lead.assignSalesperson(leadId, null);
}

async function listMyLeads(salespersonId, query) {
  const statusMap = {
    New: "NEW",
    Contacted: "CONTACTED",
    Appointment: "APPOINTMENT",
    Sold: "CLOSED",
    "Not Sold": "CLOSED",
  };
  let status = "";
  if (query.status && query.status !== "All") {
    status = statusMap[query.status] || String(query.status).toUpperCase();
  }
  return Lead.list({
    salespersonId,
    status,
    search: query.search || "",
    page: query.page,
    limit: query.limit,
  });
}

async function getLead(salespersonId, leadId) {
  return assertOwnLead(leadId, salespersonId);
}

async function setLeadStatus(salespersonId, leadId, status) {
  await assertOwnLead(leadId, salespersonId);
  if (!LEAD_STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${LEAD_STATUSES.join(", ")}`, 400);
  }
  return Lead.updateStatus(leadId, status);
}

async function addNote(salespersonId, leadId, noteText) {
  await assertOwnLead(leadId, salespersonId);
  if (!noteText || String(noteText).trim() === "") {
    throw new AppError("note is required", 400);
  }
  const id = `note_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO lead_notes (id, lead_id, user_id, note) VALUES (?, ?, ?, ?)`,
    [id, leadId, salespersonId, String(noteText).trim()]
  );
  const [rows] = await pool.query(`SELECT * FROM lead_notes WHERE id = ?`, [id]);
  return {
    id: rows[0].id,
    leadId: rows[0].lead_id,
    note: rows[0].note,
    createdAt: rows[0].created_at,
  };
}

async function markSold(salespersonId, leadId, body = {}) {
  const lead = await assertOwnLead(leadId, salespersonId);
  await Lead.updateStatus(leadId, "CLOSED");
  const deal = await SoldDeal.create({
    leadId: lead.id,
    salespersonId,
    dealershipId: lead.dealershipId,
    customerName: lead.customerName,
    vehicle: lead.vehicle,
    dealAmount: body.dealAmount || 50000,
    paymentMethod: body.paymentMethod || "Finance",
    commissionStatus: "PENDING",
  });
  return { lead: await Lead.findById(leadId), deal };
}

async function markNotSold(salespersonId, leadId) {
  await assertOwnLead(leadId, salespersonId);
  return Lead.updateStatus(leadId, "CLOSED");
}

async function listConversations(salespersonId) {
  const [rows] = await pool.query(
    `SELECT l.id, l.customer_name, l.vehicle, l.budget, l.timeline, l.status,
      (SELECT message FROM conversation_messages cm
       WHERE cm.lead_id = l.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message
     FROM leads l
     WHERE l.salesperson_id = ?
     ORDER BY l.updated_at DESC`,
    [salespersonId]
  );
  return {
    conversations: rows.map((row) => ({
      leadId: row.id,
      customerName: row.customer_name,
      vehicle: row.vehicle || "",
      budget: row.budget || "",
      timeline: row.timeline || "",
      status: row.status,
      lastMessage: row.last_message || "",
    })),
  };
}

async function getConversation(salespersonId, leadId) {
  const lead = await assertOwnLead(leadId, salespersonId);
  const messages = await Conversation.listByLead(leadId);
  return { lead, messages };
}

async function sendMessage(salespersonId, leadId, body) {
  await assertOwnLead(leadId, salespersonId);
  if (!body.message || String(body.message).trim() === "") {
    throw new AppError("message is required", 400);
  }
  return Conversation.createMessage({
    leadId,
    senderType: body.senderType || "STAFF",
    message: String(body.message).trim(),
  });
}

async function listAppointments(salespersonId, query) {
  const [result, stats] = await Promise.all([
    Appointment.listBySalesperson(salespersonId, {
      search: query.search || "",
      status: query.status || "",
      page: query.page,
      limit: query.limit,
    }),
    Appointment.getStats(salespersonId),
  ]);
  return { ...result, stats };
}

async function getAppointment(salespersonId, id) {
  const appointment = await Appointment.findById(id);
  if (!appointment || appointment.salespersonId !== salespersonId) {
    throw new AppError("Appointment not found", 404);
  }
  return appointment;
}

async function createAppointment(user, body) {
  if (!body.customerName || String(body.customerName).trim() === "") {
    throw new AppError("Customer is required", 400);
  }
  if (!body.date || !body.time) {
    throw new AppError("Date and time are required", 400);
  }
  if (body.leadId) {
    await assertOwnLead(body.leadId, user.id);
  }
  return Appointment.create({
    leadId: body.leadId || null,
    salespersonId: user.id,
    dealershipId: user.dealershipId || null,
    customerName: String(body.customerName).trim(),
    vehicle: body.vehicle || "",
    appointmentType: body.appointmentType || "Test Drive",
    date: body.date,
    time: body.time,
    notes: body.notes || "",
    status: "SCHEDULED",
  });
}

async function listSoldDeals(salespersonId, query) {
  return SoldDeal.listBySalesperson(salespersonId, {
    page: query.page,
    limit: query.limit,
  });
}

async function getSoldDeal(salespersonId, id) {
  const deal = await SoldDeal.findById(id);
  if (!deal || deal.salespersonId !== salespersonId) {
    throw new AppError("Sold deal not found", 404);
  }
  return deal;
}

async function getCommission(salespersonId) {
  const summary = await SoldDeal.getCommissionSummary(salespersonId);
  const history = await SoldDeal.listBySalesperson(salespersonId, {
    page: 1,
    limit: 50,
  });
  return { summary, history: history.deals };
}

module.exports = {
  setPresence,
  getDashboard,
  listIncomingLeads,
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
