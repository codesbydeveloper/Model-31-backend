const Lead = require("../models/Lead");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const pool = require("../config/database");
const AppError = require("../utils/AppError");
const {
  BDC_DISPATCH_STATUSES,
  BDC_PRIORITIES,
  ESCALATION_STATUSES,
} = require("../utils/constants");

const DEFAULT_SALESPERSON_CAPACITY = 8;

function formatLastActive(value) {
  if (!value) return "-";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Just now";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatResponseClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds) || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function roundOne(value) {
  return Math.round(Number(value) * 10) / 10;
}

async function listQualifiedLeads(query) {
  const dispatchStatus =
    query.status && query.status !== "All" ? String(query.status).toUpperCase() : "";

  if (dispatchStatus && !BDC_DISPATCH_STATUSES.includes(dispatchStatus)) {
    throw new AppError(
      `status must be one of: ${BDC_DISPATCH_STATUSES.join(", ")}`,
      400
    );
  }

  return Lead.list({
    search: query.search || "",
    pipeline: "DEALERSHIP",
    dispatchStatus: dispatchStatus || "",
    page: query.page,
    limit: query.limit,
  });
}

async function getLead(id) {
  const lead = await Lead.findById(id);
  if (!lead || lead.pipeline === "MODEL 31") {
    throw new AppError("Lead not found", 404);
  }
  return lead;
}

async function listQueue(query) {
  return Lead.listQueue({
    search: query.search || "",
    page: query.page,
    limit: query.limit,
  });
}

async function listAvailableSalespeople(query = {}) {
  const safePage = Math.max(1, Number(query.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(query.limit) || 8));
  const offset = (safePage - 1) * safeLimit;

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM users
     WHERE role = 'Salesperson' AND status = 'Active'`
  );
  const total = Number(countRows[0]?.total) || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.presence, u.status, u.last_active,
      d.name AS dealership_name, u.dealership_id,
      (
        SELECT COUNT(*) FROM leads l
        WHERE l.salesperson_id = u.id
          AND l.dispatch_status IN ('ASSIGNED', 'ACCEPTED', 'QUALIFIED', 'WAITING')
      ) AS active_leads
     FROM users u
     LEFT JOIN dealerships d ON d.id = u.dealership_id
     WHERE u.role = 'Salesperson' AND u.status = 'Active'
     ORDER BY
       FIELD(u.presence, 'ONLINE', 'BUSY', 'OFFLINE') ASC,
       u.name ASC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );

  const salespeople = rows.map((row) => {
    const activeLeads = Number(row.active_leads) || 0;
    const capacityMax = DEFAULT_SALESPERSON_CAPACITY;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      dealershipId: row.dealership_id || null,
      dealership: row.dealership_name || "Unassigned",
      status: String(row.presence || "OFFLINE").toUpperCase(),
      presence: String(row.presence || "OFFLINE").toUpperCase(),
      activeLeads,
      lastActive: formatLastActive(row.last_active),
      lastActiveAt: row.last_active || null,
      currentCapacity: `${activeLeads}/${capacityMax}`,
      capacityUsed: activeLeads,
      capacityMax,
    };
  });

  return {
    salespeople,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      showingFrom: total === 0 ? 0 : offset + 1,
      showingTo: Math.min(offset + salespeople.length, total),
    },
  };
}

async function getDashboard(query = {}) {
  const [appointmentRows] = await pool.query(
    `SELECT
      SUM(CASE WHEN appointment_date = CURDATE() THEN 1 ELSE 0 END) AS today_count,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status IN ('NO SHOW', 'NO_SHOW') THEN 1 ELSE 0 END) AS no_show
     FROM appointments`
  );
  const appointments = appointmentRows[0] || {};
  const todaysAppointments = Number(appointments.today_count) || 0;
  const completedAppointments = Number(appointments.completed) || 0;
  const noShows = Number(appointments.no_show) || 0;
  const conversionBase = completedAppointments + noShows;
  const appointmentConversion =
    conversionBase > 0
      ? roundOne((completedAppointments / conversionBase) * 100)
      : 0;

  const [leadRows] = await pool.query(
    `SELECT
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS qualified_today,
      SUM(
        CASE
          WHEN dispatch_status = 'WAITING'
            OR (dispatch_status = 'QUALIFIED' AND salesperson_id IS NULL)
          THEN 1 ELSE 0
        END
      ) AS waiting,
      SUM(CASE WHEN dispatch_status = 'ASSIGNED' THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN dispatch_status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN dispatch_status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired,
      SUM(
        CASE
          WHEN dispatch_status = 'ESCALATED'
            AND (escalation_status IS NULL OR escalation_status = 'OPEN')
          THEN 1 ELSE 0
        END
      ) AS escalated
     FROM leads
     WHERE pipeline = 'DEALERSHIP'`
  );
  const leads = leadRows[0] || {};

  const [avgRows] = await pool.query(
    `SELECT AVG(TIMESTAMPDIFF(SECOND, assigned_at, accepted_at)) AS avg_seconds
     FROM leads
     WHERE pipeline = 'DEALERSHIP'
       AND assigned_at IS NOT NULL
       AND accepted_at IS NOT NULL`
  );
  const avgSeconds = Number(avgRows[0]?.avg_seconds) || 0;

  const salespersonAvailability = await listAvailableSalespeople(query);

  return {
    stats: {
      todaysAppointments,
      completedAppointments,
      noShows,
      appointmentConversion,
      qualifiedToday: Number(leads.qualified_today) || 0,
      waitingForAssignment: Number(leads.waiting) || 0,
      assigned: Number(leads.assigned) || 0,
      accepted: Number(leads.accepted) || 0,
      expired: Number(leads.expired) || 0,
      escalated: Number(leads.escalated) || 0,
      averageResponseTime: formatResponseClock(avgSeconds),
    },
    salespersonAvailability,
  };
}

async function assignLead(leadId, salespersonId) {
  await getLead(leadId);
  if (!salespersonId) {
    throw new AppError("salespersonId is required", 400);
  }
  const user = await User.findById(salespersonId);
  if (!user || user.role !== "Salesperson") {
    throw new AppError("Salesperson not found", 404);
  }
  return Lead.assignSalesperson(leadId, salespersonId);
}

async function reassignLead(leadId, salespersonId) {
  return assignLead(leadId, salespersonId);
}

async function escalateLead(leadId, body = {}) {
  await getLead(leadId);
  const priority = body.priority || "MEDIUM";
  if (!BDC_PRIORITIES.includes(priority)) {
    throw new AppError(`priority must be one of: ${BDC_PRIORITIES.join(", ")}`, 400);
  }
  return Lead.escalate(leadId, {
    reason: body.reason || "System escalation",
    priority,
  });
}

async function listConversations() {
  const [rows] = await pool.query(
    `SELECT l.id, l.customer_name, l.vehicle, l.score, l.tier, l.dispatch_status,
      l.salesperson_id, u.name AS salesperson_name, l.updated_at,
      (SELECT message FROM conversation_messages cm
       WHERE cm.lead_id = l.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message
     FROM leads l
     LEFT JOIN users u ON u.id = l.salesperson_id
     WHERE l.pipeline = 'DEALERSHIP'
     ORDER BY l.updated_at DESC`
  );

  return {
    conversations: rows.map((row) => ({
      leadId: row.id,
      customerName: row.customer_name,
      vehicle: row.vehicle || "",
      score: Number(row.score) || 0,
      tier: row.tier,
      status: row.dispatch_status || row.status,
      salesperson: row.salesperson_name || "Unassigned",
      lastMessage: row.last_message || "",
      updatedAt: row.updated_at,
    })),
  };
}

async function getConversation(leadId) {
  const lead = await getLead(leadId);
  const messages = await Conversation.listByLead(leadId);
  return { lead, messages };
}

async function sendMessage(leadId, body) {
  await getLead(leadId);
  if (!body.message || String(body.message).trim() === "") {
    throw new AppError("message is required", 400);
  }
  const senderType = body.senderType || "STAFF";
  if (!["CUSTOMER", "AI", "STAFF"].includes(senderType)) {
    throw new AppError("senderType must be CUSTOMER, AI, or STAFF", 400);
  }
  return Conversation.createMessage({
    leadId,
    senderType,
    message: String(body.message).trim(),
  });
}

function slaBucket(assignedAt, acceptedAt) {
  if (!assignedAt) return null;
  const end = acceptedAt ? new Date(acceptedAt).getTime() : Date.now();
  const seconds = Math.floor((end - new Date(assignedAt).getTime()) / 1000);
  if (seconds <= 120) return "ON TIME";
  if (seconds <= 300) return "WARNING";
  return "BREACHED";
}

async function getSlaMonitoring() {
  const [rows] = await pool.query(
    `SELECT l.*, d.name AS dealership_name, u.name AS salesperson_name
     FROM leads l
     LEFT JOIN dealerships d ON d.id = l.dealership_id
     LEFT JOIN users u ON u.id = l.salesperson_id
     WHERE l.pipeline = 'DEALERSHIP' AND l.assigned_at IS NOT NULL
     ORDER BY l.assigned_at DESC
     LIMIT 50`
  );

  const leads = rows.map((row) => {
    const mapped = {
      id: row.id,
      customerName: row.customer_name,
      salesperson: row.salesperson_name || "Unassigned",
      assignedAt: row.assigned_at,
      acceptedAt: row.accepted_at,
      responseTime:
        row.assigned_at && row.accepted_at
          ? (() => {
              const ms =
                new Date(row.accepted_at).getTime() -
                new Date(row.assigned_at).getTime();
              const totalSeconds = Math.floor(ms / 1000);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
            })()
          : "-",
      slaStatus: slaBucket(row.assigned_at, row.accepted_at),
    };
    return mapped;
  });

  const onTime = leads.filter((l) => l.slaStatus === "ON TIME").length;
  const warning = leads.filter((l) => l.slaStatus === "WARNING").length;
  const breached = leads.filter((l) => l.slaStatus === "BREACHED").length;

  let avgSeconds = 0;
  const timed = rows.filter((r) => r.assigned_at && r.accepted_at);
  if (timed.length) {
    const total = timed.reduce((sum, r) => {
      return (
        sum +
        Math.floor(
          (new Date(r.accepted_at).getTime() - new Date(r.assigned_at).getTime()) /
            1000
        )
      );
    }, 0);
    avgSeconds = Math.floor(total / timed.length);
  }
  const avgMinutes = Math.floor(avgSeconds / 60);
  const avgRemSeconds = avgSeconds % 60;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chart = days.map((day) => ({ day, onTime: 0, warning: 0, breached: 0 }));
  for (const row of rows) {
    if (!row.assigned_at) continue;
    const day = days[new Date(row.assigned_at).getDay()];
    const bucket = slaBucket(row.assigned_at, row.accepted_at);
    const entry = chart.find((c) => c.day === day);
    if (!entry || !bucket) continue;
    if (bucket === "ON TIME") entry.onTime += 1;
    if (bucket === "WARNING") entry.warning += 1;
    if (bucket === "BREACHED") entry.breached += 1;
  }

  return {
    summary: {
      averageResponseTime: `${avgMinutes}m ${String(avgRemSeconds).padStart(2, "0")}s`,
      onTime,
      warning,
      breached,
      leadsWithinSla: onTime,
      leadsNearSla: warning,
      leadsOutsideSla: breached,
    },
    chart,
    leads,
  };
}

async function getTeamPerformance(query = {}) {
  const sort = query.sort || "name";
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.presence,
      SUM(CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END) AS assigned_leads,
      SUM(CASE WHEN l.dispatch_status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted_leads,
      SUM(CASE WHEN l.dispatch_status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired,
      SUM(CASE WHEN l.status = 'CLOSED' THEN 1 ELSE 0 END) AS sold,
      SUM(CASE WHEN l.status = 'APPOINTMENT' THEN 1 ELSE 0 END) AS appointments
     FROM users u
     LEFT JOIN leads l ON l.salesperson_id = u.id AND l.pipeline = 'DEALERSHIP'
     WHERE u.role = 'Salesperson' AND u.status = 'Active'
     GROUP BY u.id, u.name, u.presence`
  );

  let salespeople = rows.map((row) => ({
    id: row.id,
    name: row.name,
    presence: row.presence || "OFFLINE",
    assignedLeads: Number(row.assigned_leads) || 0,
    acceptedLeads: Number(row.accepted_leads) || 0,
    declined: 0,
    expired: Number(row.expired) || 0,
    appointments: Number(row.appointments) || 0,
    sold: Number(row.sold) || 0,
    responseTime: "-",
  }));

  if (sort === "accepted") {
    salespeople.sort((a, b) => b.acceptedLeads - a.acceptedLeads);
  } else if (sort === "assigned") {
    salespeople.sort((a, b) => b.assignedLeads - a.assignedLeads);
  } else if (sort === "sold") {
    salespeople.sort((a, b) => b.sold - a.sold);
  } else {
    salespeople.sort((a, b) => a.name.localeCompare(b.name));
  }

  const summary = {
    onlineSalespeople: salespeople.filter((s) => s.presence === "ONLINE").length,
    assignedLeads: salespeople.reduce((sum, s) => sum + s.assignedLeads, 0),
    acceptedLeads: salespeople.reduce((sum, s) => sum + s.acceptedLeads, 0),
    sold: salespeople.reduce((sum, s) => sum + s.sold, 0),
  };

  return { summary, salespeople };
}

async function listEscalations(query) {
  const result = await Lead.list({
    search: query.search || "",
    excludePipeline: "MODEL 31",
    dispatchStatus: "ESCALATED",
    page: query.page,
    limit: query.limit,
  });

  let leads = result.leads;
  if (query.escalationStatus) {
    const status = String(query.escalationStatus).toUpperCase();
    if (!ESCALATION_STATUSES.includes(status)) {
      throw new AppError("escalationStatus must be OPEN or RESOLVED", 400);
    }
    leads = leads.filter((l) => l.escalationStatus === status);
  }

  return {
    escalations: leads.map((lead) => ({
      id: lead.id,
      customerName: lead.customerName,
      vehicle: lead.vehicle,
      reason: lead.escalationReason || "System escalation",
      salesperson: lead.salesperson,
      salespersonId: lead.salespersonId,
      priority: lead.escalationPriority || "MEDIUM",
      status: lead.escalationStatus || "OPEN",
      escalatedAt: lead.escalatedAt,
      score: lead.score,
      tier: lead.tier,
    })),
    pagination: result.pagination,
  };
}

async function resolveEscalation(leadId) {
  await getLead(leadId);
  return Lead.resolveEscalation(leadId);
}

module.exports = {
  getDashboard,
  listQualifiedLeads,
  getLead,
  listQueue,
  listAvailableSalespeople,
  assignLead,
  reassignLead,
  escalateLead,
  listConversations,
  getConversation,
  sendMessage,
  getSlaMonitoring,
  getTeamPerformance,
  listEscalations,
  resolveEscalation,
};
