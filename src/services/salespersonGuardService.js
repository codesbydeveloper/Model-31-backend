const { randomUUID } = require("crypto");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const AppError = require("../utils/AppError");
const { routeLeadRealtime } = require("./routingEngineService");
const { recordTimelineEvent } = require("./timelineService");

const DEAD_STATUSES = new Set(["LOST", "DEAD", "BAD_NUMBER", "CLOSED"]);
const SLA_MINUTES = 5;
const INACTION_MAX_AGE_HOURS = 24;

async function hasOutboundActivity(leadId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM conversation_messages
     WHERE lead_id = ? AND sender_type <> 'SYSTEM'`,
    [leadId]
  );
  return Number(rows[0]?.total) > 0;
}

async function hasActivity(lead) {
  if (lead.acceptedAt) return true;
  const [rows] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM conversation_messages WHERE lead_id = ? AND sender_type <> 'SYSTEM') AS msgs,
       (SELECT COUNT(*) FROM lead_notes WHERE lead_id = ?) AS notes`,
    [lead.id, lead.id]
  );
  return Number(rows[0]?.msgs) > 0 || Number(rows[0]?.notes) > 0;
}

async function reassignLead(lead) {
  const result = await routeLeadRealtime({
    id: lead.id,
    tier: lead.tier,
    dealershipId: lead.dealershipId,
    customerPhone: lead.customerPhone,
    customerEmail: lead.customerEmail,
    customerName: lead.customerName,
    excludeSalespersonId: lead.salespersonId || null,
  });
  if (!result?.salespersonId) {
    await Lead.assignSalesperson(lead.id, null);
  }
  return result;
}

async function assertStatusChangeAllowed(leadId, newStatus) {
  const normalized = String(newStatus || "").trim().toUpperCase();
  if (!DEAD_STATUSES.has(normalized)) return;

  const lead = await Lead.findById(leadId);
  if (!lead) throw new AppError("Lead not found", 404);

  const ageMinutes = (Date.now() - new Date(lead.createdAt).getTime()) / 60000;
  const outbound = await hasOutboundActivity(lead.id);
  if (!(ageMinutes < SLA_MINUTES && !outbound)) return;

  await Lead.updateStatus(lead.id, "NEW");
  await reassignLead(lead);
  try {
    await Lead.escalate(lead.id, {
      reason: "Suspicious early dead status",
      priority: "HIGH",
    });
  } catch (err) {
    console.error("[STATUS-GUARD] flag failed:", err.message);
  }
  await pool.query(
    `INSERT INTO lead_guard_events (id, lead_id, guard_type, salesperson_id, detail)
     VALUES (?, ?, 'STATUS', ?, ?)`,
    [
      `grd_${randomUUID().slice(0, 8)}`,
      lead.id,
      lead.salespersonId || null,
      "Suspicious early dead status",
    ]
  );
  await recordTimelineEvent({
    leadId: lead.id,
    phone: lead.customerPhone,
    email: lead.customerEmail,
    customerName: lead.customerName,
    dealershipId: lead.dealershipId,
    eventType: "ESCALATION",
    message: "Suspicious early dead status was blocked and the lead was reassigned.",
  });

  throw new AppError(
    "Status change blocked: suspicious early dead status. Lead stays NEW, was reassigned, and was flagged.",
    403,
    { code: "STATUS_GUARD", leadId: lead.id }
  );
}

async function autoTextCustomer(lead) {
  const message =
    "Model 31: We received your inquiry and a specialist will reach out shortly.";
  await pool.query(
    `INSERT INTO conversation_messages (id, lead_id, sender_type, message)
     VALUES (?, ?, 'SYSTEM', ?)`,
    [`msg_${randomUUID().slice(0, 8)}`, lead.id, message]
  );
  await recordTimelineEvent({
    leadId: lead.id,
    phone: lead.customerPhone,
    email: lead.customerEmail,
    customerName: lead.customerName,
    dealershipId: lead.dealershipId,
    eventType: "RESCUE",
    message,
  });
}

async function runInactionGuard() {
  const [rows] = await pool.query(
    `SELECT l.id
     FROM leads l
     WHERE l.created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
       AND l.created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       AND l.status <> 'CLOSED'
       AND l.accepted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM conversation_messages cm
         WHERE cm.lead_id = l.id AND cm.sender_type <> 'SYSTEM'
       )
       AND NOT EXISTS (
         SELECT 1 FROM lead_notes n WHERE n.lead_id = l.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM lead_guard_events g
         WHERE g.lead_id = l.id AND g.guard_type = 'INACTION'
       )
     ORDER BY l.created_at ASC
     LIMIT 50`,
    [SLA_MINUTES, INACTION_MAX_AGE_HOURS]
  );

  let processed = 0;
  for (const row of rows) {
    const lead = await Lead.findById(row.id);
    if (!lead || (await hasActivity(lead))) continue;
    const previousSalespersonId = lead.salespersonId;
    await reassignLead(lead);
    await autoTextCustomer(lead);
    if (previousSalespersonId) {
      await pool.query(
        `INSERT INTO salesperson_penalties (id, salesperson_id, lead_id, reason)
         VALUES (?, ?, ?, ?)`,
        [
          `pen_${randomUUID().slice(0, 8)}`,
          previousSalespersonId,
          lead.id,
          "Missed 5 minute speed-to-lead SLA",
        ]
      );
    }
    await pool.query(
      `INSERT INTO lead_guard_events (id, lead_id, guard_type, salesperson_id, detail)
       VALUES (?, ?, 'INACTION', ?, ?)`,
      [
        `grd_${randomUUID().slice(0, 8)}`,
        lead.id,
        previousSalespersonId,
        "Missed 5 minute speed-to-lead SLA",
      ]
    );
    processed += 1;
  }
  return { processed };
}

async function listGuardEvents({ page = 1, limit = 20 } = {}) {
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM lead_guard_events");
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const [rows] = await pool.query(
    `SELECT g.*, u.name AS salesperson_name
     FROM lead_guard_events g
     LEFT JOIN users u ON u.id = g.salesperson_id
     ORDER BY g.created_at DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );
  const [penalties] = await pool.query(
    `SELECT p.*, u.name AS salesperson_name
     FROM salesperson_penalties p
     LEFT JOIN users u ON u.id = p.salesperson_id
     ORDER BY p.created_at DESC
     LIMIT 20`
  );
  return {
    slaMinutes: SLA_MINUTES,
    events: rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      guardType: row.guard_type,
      salespersonId: row.salesperson_id,
      salesperson: row.salesperson_name || null,
      detail: row.detail,
      createdAt: row.created_at,
    })),
    penalties: penalties.map((row) => ({
      id: row.id,
      salespersonId: row.salesperson_id,
      salesperson: row.salesperson_name || null,
      leadId: row.lead_id,
      reason: row.reason,
      createdAt: row.created_at,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

module.exports = {
  assertStatusChangeAllowed,
  runInactionGuard,
  listGuardEvents,
  SLA_MINUTES,
};
