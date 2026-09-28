const { randomUUID } = require("crypto");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const { recordTimelineEvent } = require("./timelineService");

const CIRCUIT_BREAKER_MS = 150;

const ROUTING_CONFIG = {
  developmentLeaks: {
    hot: { A: 0.9, B: 0.1, C: 0 },
    warm: { A: 0.4, B: 0.5, C: 0.1 },
    cold: { A: 0.1, B: 0.3, C: 0.6 },
  },
  fatigueRules: {
    maxActiveCustomers: 12,
    maxLastResponseSeconds: 600,
  },
  maxShareCap: 35,
  minLeadsFloorWeek: 5,
};

const queues = { A: [], B: [], C: [], ALL: [] };
const salespersonState = new Map();
const locks = new Map();

function weightedRandomChoice(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  if (total <= 0) return "B";
  let cursor = Math.random() * total;
  for (const [band, weight] of entries) {
    cursor -= Number(weight);
    if (cursor <= 0) return band;
  }
  return entries[0][0];
}

function tryLock(key, ttlMs = 1000) {
  const now = Date.now();
  const expires = locks.get(key);
  if (expires && expires > now) return false;
  locks.set(key, now + ttlMs);
  return true;
}

function unlock(key) {
  locks.delete(key);
}

function nextInRoundRobinQueue(band) {
  const queue = queues[band];
  if (!queue || queue.length === 0) return null;
  queue.sort((a, b) => a.score - b.score || String(a.id).localeCompare(String(b.id)));
  const next = queue[0];
  next.score += 1;
  return next.id;
}

function intentTierFrom(lead) {
  const raw = String(lead.intentTier || lead.intent_tier || lead.tier || "")
    .trim()
    .toLowerCase();
  if (raw === "hot" || raw === "a" || raw === "tier a") return "hot";
  if (raw === "cold" || raw === "c" || raw === "d" || raw === "tier c" || raw === "tier d") {
    return "cold";
  }
  if (raw === "warm" || raw === "b" || raw === "tier b") return "warm";
  return "warm";
}

async function recalculatePerformanceBands() {
  const [people] = await pool.query(
    `SELECT id, name, dealership_id, presence
     FROM users
     WHERE role = 'Salesperson' AND status = 'Active'`
  );
  const [leadCounts] = await pool.query(
    `SELECT salesperson_id, COUNT(*) AS leads_30d
     FROM leads
     WHERE salesperson_id IS NOT NULL
       AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY salesperson_id`
  );
  const [closedCounts] = await pool.query(
    `SELECT salesperson_id, COUNT(*) AS closed_deals
     FROM sold_deals
     WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY salesperson_id`
  );
  const [activeCounts] = await pool.query(
    `SELECT salesperson_id, COUNT(*) AS active_customers
     FROM leads
     WHERE salesperson_id IS NOT NULL AND status <> 'CLOSED'
     GROUP BY salesperson_id`
  );

  const leadsById = new Map(leadCounts.map((row) => [row.salesperson_id, Number(row.leads_30d) || 0]));
  const closedById = new Map(
    closedCounts.map((row) => [row.salesperson_id, Number(row.closed_deals) || 0])
  );
  const activeById = new Map(
    activeCounts.map((row) => [row.salesperson_id, Number(row.active_customers) || 0])
  );
  const totalLeads = [...leadsById.values()].reduce((sum, value) => sum + value, 0);

  queues.A = [];
  queues.B = [];
  queues.C = [];
  queues.ALL = [];
  salespersonState.clear();

  for (const person of people) {
    const leads30d = leadsById.get(person.id) || 0;
    const closedDeals = closedById.get(person.id) || 0;
    const closeRate = leads30d > 0 ? closedDeals / leads30d : 0;
    let band = "C";
    if (closeRate >= 0.18 && leads30d >= 20) band = "A";
    else if (closeRate >= 0.1) band = "B";

    const sharePercent = totalLeads > 0 ? (leads30d / totalLeads) * 100 : 0;
    const presence = String(person.presence || "OFFLINE").toUpperCase();
    const record = {
      id: person.id,
      name: person.name,
      dealershipId: person.dealership_id,
      band,
      closeRate,
      sharePercent30d: sharePercent,
      leads30d,
      availability: presence === "ONLINE" ? "available" : "offline",
      activeCustomers: activeById.get(person.id) || 0,
      lastResponseSeconds: 0,
    };
    salespersonState.set(person.id, record);
    queues[band].push({ id: person.id, score: 0 });
    queues.ALL.push({ id: person.id, score: 0 });

    await pool.query(
      `INSERT INTO salesperson_metrics
        (salesperson_id, band, close_rate, share_percent_30d, leads_30d)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        band = VALUES(band),
        close_rate = VALUES(close_rate),
        share_percent_30d = VALUES(share_percent_30d),
        leads_30d = VALUES(leads_30d)`,
      [person.id, band, closeRate, sharePercent, leads30d]
    );
  }

  return listBands();
}

async function logRouting({ leadId, salespersonId, band, fallback, reason }) {
  await pool.query(
    `INSERT INTO routing_logs (id, lead_id, salesperson_id, band, fallback, reason_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      `rte_${randomUUID().slice(0, 8)}`,
      leadId,
      salespersonId || null,
      band || null,
      fallback ? 1 : 0,
      JSON.stringify(reason || {}),
    ]
  );
}

async function assignLead(lead, salespersonId, band, fallback, reason) {
  if (salespersonId) {
    await Lead.assignSalesperson(lead.id, salespersonId);
    const current = salespersonState.get(salespersonId);
    if (current) current.activeCustomers += 1;
    await recordTimelineEvent({
      leadId: lead.id,
      phone: lead.customerPhone || lead.phone_number || lead.phone,
      email: lead.customerEmail || lead.email,
      customerName: lead.customerName || lead.customer_name,
      dealershipId: lead.dealershipId || lead.dealership_id || null,
      eventType: "ROUTING_PROTECT",
      message: fallback
        ? `Fallback round-robin assigned this lead to salesperson ${salespersonId}.`
        : `Routed to band ${band} salesperson ${salespersonId}.`,
    });
  }
  await logRouting({
    leadId: lead.id,
    salespersonId,
    band,
    fallback,
    reason,
  });
  return {
    salespersonId: salespersonId || null,
    band: band || null,
    fallback: Boolean(fallback),
    reason,
  };
}

async function fallbackRoundRobinAnyBand(lead, reason) {
  let salespersonId = nextInRoundRobinQueue("ALL");
  if (salespersonId && salespersonId === lead.excludeSalespersonId) {
    salespersonId = nextInRoundRobinQueue("ALL");
  }
  if (salespersonId === lead.excludeSalespersonId) salespersonId = null;
  return assignLead(lead, salespersonId, "ALL", true, {
    ...reason,
    fallback: "ROUND_ROBIN_ANY_BAND",
  });
}

async function routeLeadRealtime(lead) {
  const start = Date.now();
  const timedOut = () => Date.now() - start > CIRCUIT_BREAKER_MS;
  const intentTier = intentTierFrom(lead);
  const bandWeights = ROUTING_CONFIG.developmentLeaks[intentTier];
  const targetBand = weightedRandomChoice(bandWeights);
  const lockKey = `routing:${lead.id}`;
  const locked = tryLock(lockKey, 1000);

  try {
    if (!locked || timedOut()) {
      return fallbackRoundRobinAnyBand(lead, {
        intentTier,
        targetBand,
        reason: !locked ? "LOCK_BUSY" : "CIRCUIT_BREAKER",
      });
    }

    let salespersonId = nextInRoundRobinQueue(targetBand);
    if (!salespersonId || salespersonId === lead.excludeSalespersonId) {
      salespersonId = nextInRoundRobinQueue(targetBand);
    }
    if (!salespersonId || salespersonId === lead.excludeSalespersonId) {
      return fallbackRoundRobinAnyBand(lead, { intentTier, targetBand, reason: "EMPTY_BAND" });
    }

    const salesperson = salespersonState.get(salespersonId);
    if (!salesperson) {
      return fallbackRoundRobinAnyBand(lead, { intentTier, targetBand, reason: "MISSING_STATE" });
    }

    if (salesperson.availability !== "available") {
      return fallbackRoundRobinAnyBand(lead, {
        intentTier,
        targetBand,
        reason: "UNAVAILABLE",
        salespersonId,
      });
    }
    if (salesperson.activeCustomers > ROUTING_CONFIG.fatigueRules.maxActiveCustomers) {
      return fallbackRoundRobinAnyBand(lead, {
        intentTier,
        targetBand,
        reason: "FATIGUE_ACTIVE_CUSTOMERS",
        salespersonId,
      });
    }
    if (salesperson.lastResponseSeconds > ROUTING_CONFIG.fatigueRules.maxLastResponseSeconds) {
      return fallbackRoundRobinAnyBand(lead, {
        intentTier,
        targetBand,
        reason: "FATIGUE_RESPONSE",
        salespersonId,
      });
    }
    if (salesperson.sharePercent30d > ROUTING_CONFIG.maxShareCap) {
      return fallbackRoundRobinAnyBand(lead, {
        intentTier,
        targetBand,
        reason: "MAX_SHARE_CAP",
        salespersonId,
      });
    }
    if (timedOut()) {
      return fallbackRoundRobinAnyBand(lead, { intentTier, targetBand, reason: "CIRCUIT_BREAKER" });
    }

    return assignLead(lead, salespersonId, salesperson.band, false, {
      intentTier,
      targetBand,
      starvationProtected: salesperson.leads30d < ROUTING_CONFIG.minLeadsFloorWeek,
      fairness: {
        sharePercent30d: salesperson.sharePercent30d,
        leads30d: salesperson.leads30d,
      },
    });
  } finally {
    if (locked) unlock(lockKey);
  }
}

async function listBands() {
  const [rows] = await pool.query(
    `SELECT m.*, u.name, u.email, u.dealership_id, d.name AS dealership_name
     FROM salesperson_metrics m
     JOIN users u ON u.id = m.salesperson_id
     LEFT JOIN dealerships d ON d.id = u.dealership_id
     ORDER BY m.band ASC, u.name ASC`
  );
  return {
    config: ROUTING_CONFIG,
    circuitBreakerMs: CIRCUIT_BREAKER_MS,
    bands: rows.map((row) => ({
      salespersonId: row.salesperson_id,
      name: row.name,
      email: row.email,
      dealershipId: row.dealership_id,
      dealership: row.dealership_name || null,
      band: row.band,
      closeRate: Number(row.close_rate),
      sharePercent30d: Number(row.share_percent_30d),
      leads30d: Number(row.leads_30d),
      updatedAt: row.updated_at,
    })),
  };
}

async function listRoutingLogs({ page = 1, limit = 20, leadId = "" } = {}) {
  const where = [];
  const params = [];
  if (leadId) {
    where.push("r.lead_id = ?");
    params.push(leadId);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM routing_logs r ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS salesperson_name
     FROM routing_logs r
     LEFT JOIN users u ON u.id = r.salesperson_id
     ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );
  return {
    logs: rows.map((row) => ({
      id: row.id,
      leadId: row.lead_id,
      salespersonId: row.salesperson_id,
      salesperson: row.salesperson_name || null,
      band: row.band,
      fallback: Number(row.fallback) === 1,
      reason: parseJson(row.reason_json),
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
  ROUTING_CONFIG,
  CIRCUIT_BREAKER_MS,
  recalculatePerformanceBands,
  routeLeadRealtime,
  listBands,
  listRoutingLogs,
};
