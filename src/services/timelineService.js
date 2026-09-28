const { randomUUID } = require("crypto");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const { buildCustomerKey } = require("./identityKey");

const QUALIFYING_EVENT_TYPES = [
  "REVIVAL",
  "RESCUE",
  "APPOINTMENT_SET",
  "APPOINTMENT_CONFIRM",
  "APPOINTMENT_RESCHEDULE",
  "SERVICE_TO_SALES",
  "NEGOTIATION_SUPPORT",
  "ESCALATION",
  "ROUTING_PROTECT",
];

async function recordTimelineEvent({
  id,
  leadId = null,
  phone = "",
  email = "",
  customerName = "",
  customerKey = "",
  eventType,
  message = "",
  eventAt = new Date(),
}) {
  const key =
    customerKey ||
    buildCustomerKey({ phone, email, name: customerName }).key ||
    "";
  const eventId = id || `evt_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO timeline_events
      (id, lead_id, customer_key, event_type, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      leadId,
      key ? String(key).slice(0, 191) : null,
      eventType,
      message || null,
      eventAt instanceof Date ? eventAt : new Date(eventAt),
    ]
  );
  return eventId;
}

async function backfillTimelineFromHistory() {
  const [messages] = await pool.query(
    `SELECT cm.id, cm.lead_id, cm.sender_type, cm.message, cm.created_at,
            l.customer_phone, l.customer_email, l.customer_name, l.dealership_id
     FROM conversation_messages cm
     JOIN leads l ON l.id = cm.lead_id
     LEFT JOIN timeline_events te ON te.id = CONCAT('tl_msg_', cm.id)
     WHERE te.id IS NULL
     LIMIT 500`
  );

  for (const row of messages) {
    const eventType = String(row.sender_type).toUpperCase() === "SYSTEM" ? "REVIVAL" : "RESCUE";
    await recordTimelineEvent({
      id: `tl_msg_${row.id}`,
      leadId: row.lead_id,
      phone: row.customer_phone,
      email: row.customer_email,
      customerName: row.customer_name,
      dealershipId: row.dealership_id,
      eventType,
      message: row.message,
      eventAt: row.created_at,
    });
  }

  const [appointments] = await pool.query(
    `SELECT a.id, a.lead_id, a.customer_name, a.notes, a.created_at, a.dealership_id,
            l.customer_phone, l.customer_email, l.customer_name AS lead_name
     FROM appointments a
     LEFT JOIN leads l ON l.id = a.lead_id
     LEFT JOIN timeline_events te ON te.id = CONCAT('tl_apt_', a.id)
     WHERE te.id IS NULL
     LIMIT 500`
  );

  for (const row of appointments) {
    await recordTimelineEvent({
      id: `tl_apt_${row.id}`,
      leadId: row.lead_id,
      phone: row.customer_phone,
      email: row.customer_email,
      customerName: row.lead_name || row.customer_name,
      dealershipId: row.dealership_id,
      eventType: "APPOINTMENT_SET",
      message: row.notes || `Appointment set for ${row.customer_name}`,
      eventAt: row.created_at,
    });
  }
}

async function listEventsForSale(sale) {
  const params = [];
  const match = [];
  if (sale.customerId) {
    match.push("t.lead_id = ?");
    params.push(sale.customerId);
  }
  if (sale.customerKey) {
    match.push("t.customer_key = ?");
    params.push(sale.customerKey);
  }
  if (!match.length) return [];

  params.push(sale.saleDate, sale.saleDate);
  const [rows] = await pool.query(
    `SELECT t.*
     FROM timeline_events t
     WHERE (${match.join(" OR ")})
       AND t.created_at >= DATE_SUB(?, INTERVAL 14 DAY)
       AND t.created_at < DATE_ADD(?, INTERVAL 1 DAY)
       AND t.event_type IN (${QUALIFYING_EVENT_TYPES.map(() => "?").join(", ")})
     ORDER BY t.created_at ASC`,
    [...params, ...QUALIFYING_EVENT_TYPES]
  );

  return rows.map(mapEvent);
}

function mapEvent(row) {
  return {
    id: row.id,
    leadId: row.lead_id,
    customerKey: row.customer_key,
    dealershipId: row.dealership_id,
    eventType: row.event_type,
    message: row.detail || "",
    eventAt: row.created_at,
  };
}

async function customerKeyForLead(leadId) {
  if (!leadId) return "";
  const lead = await Lead.findById(leadId);
  if (!lead) return "";
  return buildCustomerKey({
    phone: lead.customerPhone,
    email: lead.customerEmail,
    name: lead.customerName,
  }).key;
}

module.exports = {
  QUALIFYING_EVENT_TYPES,
  recordTimelineEvent,
  backfillTimelineFromHistory,
  listEventsForSale,
  customerKeyForLead,
};
