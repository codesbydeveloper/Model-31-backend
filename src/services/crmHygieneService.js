const { randomUUID } = require("crypto");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const { isFallbackParserActive } = require("./crmMeltPlate");
const { recordHygieneOutcome } = require("./hygieneStats");
const { routeLeadRealtime } = require("./routingEngineService");

const VALID_STATUSES = new Set([
  "New",
  "Contacted",
  "Working",
  "Appointment Set",
  "Sold",
  "Lost",
]);

const STATUS_MAP = {
  New: "NEW",
  Contacted: "CONTACTED",
  Working: "QUALIFYING",
  "Appointment Set": "APPOINTMENT",
  Sold: "CLOSED",
  Lost: "NEW",
};

const queue = [];
let working = false;

function normalizePayload(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  return {
    lead_id: String(payload.lead_id || payload.leadId || "").slice(0, 64),
    phone_number: payload.phone_number || payload.phoneNumber || payload.phone || "",
    status: payload.status || "",
    created_at: payload.created_at || payload.createdAt || "",
    customer_name: payload.customer_name || payload.customerName || payload.name || "",
    email: payload.email || payload.customer_email || payload.customerEmail || "",
    dealership_id: payload.dealership_id || payload.dealershipId || "",
    intent_tier: payload.intent_tier || payload.intentTier || "",
    vehicle: payload.vehicle || "",
    raw: payload,
  };
}

function scan(payload) {
  const errors = [];
  if (!payload.lead_id) errors.push("lead_id");
  if (!payload.phone_number) errors.push("phone_number");
  if (!payload.status) errors.push("status");
  if (errors.length) {
    return { outcome: "QUARANTINE", result: { missingFields: errors, raw: payload.raw } };
  }

  let autoPatch = false;
  let schemaDrift = false;
  const safer = isFallbackParserActive();

  if (!payload.created_at) {
    payload.created_at = Date.now();
    autoPatch = true;
  }
  if (!payload.customer_name) {
    payload.customer_name = "Unknown";
    autoPatch = true;
  }
  if (!VALID_STATUSES.has(payload.status)) {
    schemaDrift = true;
    if (safer) {
      return {
        outcome: "QUARANTINE",
        result: { missingFields: ["invalid_status"], raw: payload.raw },
        autoPatch,
        schemaDrift,
      };
    }
    payload.status = "New";
    autoPatch = true;
  }

  return { outcome: "PASSED_AND_PATCHED", result: payload, autoPatch, schemaDrift };
}

async function dealershipExists(id) {
  if (!id) return false;
  const [rows] = await pool.query("SELECT id FROM dealerships WHERE id = ? LIMIT 1", [id]);
  return rows.length > 0;
}

async function upsertInternalLead(payload) {
  const leadId = String(payload.lead_id).slice(0, 64);
  const dealershipId = (await dealershipExists(payload.dealership_id))
    ? payload.dealership_id
    : null;
  const internalStatus = STATUS_MAP[payload.status] || "NEW";
  const existing = await Lead.findById(leadId);

  if (!existing) {
    try {
      return await Lead.create({
        id: leadId,
        customerName: payload.customer_name || "Unknown",
        customerPhone: payload.phone_number,
        customerEmail: payload.email || null,
        vehicle: payload.vehicle || null,
        status: internalStatus,
        dealershipId,
        source: "CRM",
        pipeline: "MODEL 31",
        notes:
          payload.status === "Lost"
            ? "CRM status Lost was ignored. Sealed engine kept the lead NEW."
            : null,
      });
    } catch (err) {
      if (err.code !== "ER_DUP_ENTRY") throw err;
      return Lead.findById(leadId);
    }
  }

  if (!existing.salespersonId) {
    await Lead.updateStatus(existing.id, internalStatus);
  }
  return Lead.findById(existing.id);
}

async function storeClean(payload, internalLeadId) {
  await pool.query(
    `INSERT INTO crm_hygiene_leads
      (id, lead_id, phone_number, status, hygiene_status, payload, internal_lead_id)
     VALUES (?, ?, ?, ?, 'PASSED_AND_PATCHED', ?, ?)`,
    [
      `hyg_${randomUUID().slice(0, 8)}`,
      payload.lead_id,
      payload.phone_number,
      payload.status,
      JSON.stringify(payload.raw || payload),
      internalLeadId,
    ]
  );
}

async function storeQuarantine(result) {
  await pool.query(
    `INSERT INTO crm_quarantine (id, lead_id, missing_fields, raw_json)
     VALUES (?, ?, ?, ?)`,
    [
      `qrn_${randomUUID().slice(0, 8)}`,
      result.raw?.lead_id || result.raw?.leadId || null,
      JSON.stringify(result.missingFields || []),
      JSON.stringify(result.raw || {}),
    ]
  );
}

async function processOne(raw) {
  const payload = normalizePayload(raw);
  const scanned = scan(payload);
  await recordHygieneOutcome({
    autoPatch: Boolean(scanned.autoPatch),
    schemaDrift: Boolean(scanned.schemaDrift),
    quarantine: scanned.outcome === "QUARANTINE",
  });

  if (scanned.outcome === "QUARANTINE") {
    await storeQuarantine(scanned.result);
    return;
  }

  const lead = await upsertInternalLead(scanned.result);
  await storeClean(scanned.result, lead?.id || null);
  if (lead && !lead.salespersonId) {
    await routeLeadRealtime({
      id: lead.id,
      intentTier: scanned.result.intent_tier,
      tier: lead.tier,
      dealershipId: lead.dealershipId,
      customerPhone: lead.customerPhone,
      customerEmail: lead.customerEmail,
      customerName: lead.customerName,
    });
  }
}

function drain() {
  if (working) return;
  working = true;
  setImmediate(async () => {
    try {
      while (queue.length) {
        const item = queue.shift();
        try {
          await processOne(item);
        } catch (err) {
          console.error("[CRM-HYGIENE] worker failed:", err.message);
        }
      }
    } finally {
      working = false;
      if (queue.length) drain();
    }
  });
}

function enqueueLead(raw) {
  queue.push(raw);
  drain();
}

async function listQuarantine({ page = 1, limit = 20 } = {}) {
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM crm_quarantine");
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const [rows] = await pool.query(
    `SELECT * FROM crm_quarantine ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      missingFields: parseJson(row.missing_fields) || [],
      raw: parseJson(row.raw_json),
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

async function listCleanLeads({ page = 1, limit = 20 } = {}) {
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM crm_hygiene_leads");
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const [rows] = await pool.query(
    `SELECT * FROM crm_hygiene_leads ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [safeLimit, offset]
  );
  return {
    leads: rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      phoneNumber: row.phone_number,
      status: row.status,
      hygieneStatus: row.hygiene_status,
      internalLeadId: row.internal_lead_id,
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

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

module.exports = {
  enqueueLead,
  listQuarantine,
  listCleanLeads,
  VALID_STATUSES,
};
