const { randomUUID } = require("crypto");
const pool = require("../config/database");
const AppError = require("../utils/AppError");
const {
  digits,
  normalizeEmail,
  lastName,
  diceSimilarity,
  buildCustomerKey,
} = require("./identityKey");
const {
  backfillTimelineFromHistory,
  listEventsForSale,
  QUALIFYING_EVENT_TYPES,
} = require("./timelineService");

const PRICE_PER_INFLUENCED_SALE = 31;

function monthWindow(month) {
  const now = new Date();
  let year = now.getFullYear();
  let mon = now.getMonth() + 1;
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    year = Number(month.slice(0, 4));
    mon = Number(month.slice(5, 7));
  }
  const periodMonth = `${year}-${String(mon).padStart(2, "0")}`;
  const start = `${periodMonth}-01`;
  const nextMonth = mon === 12 ? 1 : mon + 1;
  const nextYear = mon === 12 ? year + 1 : year;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { periodMonth, start, end };
}

async function resolveIdentity(unit, dealershipId) {
  const phone = digits(unit.phone);
  const email = normalizeEmail(unit.email);
  const name = String(unit.customerName || "").trim();
  const last = lastName(name);

  const params = [dealershipId];
  const filters = [];
  if (email) {
    filters.push("LOWER(IFNULL(customer_email, '')) = ?");
    params.push(email);
  }
  if (phone) {
    filters.push(
      "REPLACE(REPLACE(REPLACE(REPLACE(IFNULL(customer_phone, ''), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?"
    );
    params.push(`%${phone}`);
  }
  if (!filters.length) {
    return {
      customerId: null,
      matchTier: null,
      customerKey: buildCustomerKey({
        phone: unit.phone,
        email: unit.email,
        name: unit.customerName,
      }).key,
    };
  }

  const [rows] = await pool.query(
    `SELECT id, customer_name, customer_phone, customer_email
     FROM leads
     WHERE dealership_id = ?
       AND (${filters.join(" OR ")})
     LIMIT 300`,
    params
  );

  const candidates = rows.map((row) => ({
    id: row.id,
    name: row.customer_name || "",
    phone: digits(row.customer_phone),
    email: normalizeEmail(row.customer_email),
    last: lastName(row.customer_name),
  }));

  const tier1 = candidates.find(
    (row) => phone && email && row.phone === phone && row.email === email
  );
  if (tier1) {
    return finishMatch(tier1, 1);
  }

  const tier2 = candidates.find((row) => phone && last && row.phone === phone && row.last === last);
  if (tier2) {
    return finishMatch(tier2, 2);
  }

  if (email && name) {
    let best = null;
    let bestScore = 0;
    for (const row of candidates) {
      if (row.email !== email) continue;
      const score = diceSimilarity(name, row.name);
      if (score > bestScore) {
        bestScore = score;
        best = row;
      }
    }
    if (best && bestScore > 0.7) {
      return finishMatch(best, 3);
    }
  }

  return {
    customerId: null,
    matchTier: null,
    customerKey: buildCustomerKey({ phone: unit.phone, email: unit.email, name }).key,
  };
}

function finishMatch(row, tier) {
  const built = buildCustomerKey({
    phone: row.phone,
    email: row.email,
    name: row.name,
  });
  return { customerId: row.id, matchTier: tier, customerKey: built.key };
}

async function ingestSoldLog({ dealershipId, units, month }) {
  if (!dealershipId) throw new AppError("dealershipId is required", 400);
  const [dealers] = await pool.query("SELECT id FROM dealerships WHERE id = ? LIMIT 1", [
    dealershipId,
  ]);
  if (!dealers.length) throw new AppError("Dealership not found", 404);
  if (!Array.isArray(units) || units.length === 0) {
    throw new AppError("units must be a non-empty array", 400);
  }

  const saved = [];
  const errors = [];
  const months = new Set();
  for (const unit of units) {
    const saleId = String(unit.saleId || unit.sale_id || unit.id || "").trim();
    const saleDate = String(unit.saleDate || unit.sale_date || "").slice(0, 10);
    const vin = unit.vin || null;
    const stockNumber = unit.stockNumber || unit.stock_number || null;
    if (!saleId || !saleDate) {
      errors.push({ saleId: saleId || null, message: "saleId and saleDate are required" });
      continue;
    }
    const identity = await resolveIdentity(
      {
        phone: unit.phone || unit.phone_number,
        email: unit.email,
        customerName: unit.customerName || unit.customer_name,
      },
      dealershipId
    );
    const id = saleId.slice(0, 64);
    const customerName = unit.customerName || unit.customer_name || null;
    await pool.query(
      `INSERT INTO stg_sold_units
        (id, dealership_id, sale_id, vin, stock_number, sale_date, phone, email, last_name,
         customer_name, customer_key, customer_id, match_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        sale_id = VALUES(sale_id),
        vin = VALUES(vin),
        stock_number = VALUES(stock_number),
        sale_date = VALUES(sale_date),
        phone = VALUES(phone),
        email = VALUES(email),
        last_name = VALUES(last_name),
        customer_name = VALUES(customer_name),
        customer_key = VALUES(customer_key),
        customer_id = VALUES(customer_id),
        match_tier = VALUES(match_tier)`,
      [
        id,
        dealershipId,
        id,
        vin,
        stockNumber,
        saleDate,
        unit.phone || unit.phone_number || null,
        normalizeEmail(unit.email) || null,
        lastName(customerName) || null,
        customerName,
        identity.customerKey ? String(identity.customerKey).slice(0, 191) : null,
        identity.customerId,
        identity.matchTier,
      ]
    );
    saved.push({
      saleId: id,
      customerId: identity.customerId,
      matchTier: identity.matchTier,
      customerKey: identity.customerKey,
    });
    months.add(saleDate.slice(0, 7));
  }

  if (month) months.add(month);
  const billing = [];
  for (const period of months) {
    billing.push(await runAttribution({ dealershipId, month: period }));
  }
  return {
    ingested: saved.length,
    matched: saved.filter((row) => row.customerId).length,
    units: saved,
    errors,
    billing,
  };
}

async function runAttribution({ dealershipId = null, month } = {}) {
  await backfillTimelineFromHistory();
  const { periodMonth, start, end } = monthWindow(month);
  const params = [start, end];
  let dealerFilter = "";
  if (dealershipId) {
    dealerFilter = "AND s.dealership_id = ?";
    params.push(dealershipId);
  }

  const placeholders = QUALIFYING_EVENT_TYPES.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT
       s.id AS sale_id,
       s.dealership_id,
       s.vin,
       s.stock_number,
       s.sale_date,
       s.customer_key,
       s.customer_id,
       COUNT(t.id) AS qualifying_event_count,
       GROUP_CONCAT(DISTINCT t.event_type) AS audit_events
     FROM stg_sold_units s
     LEFT JOIN timeline_events t
       ON (
         (s.customer_id IS NOT NULL AND t.lead_id = s.customer_id)
         OR (s.customer_key IS NOT NULL AND s.customer_key <> '' AND t.customer_key = s.customer_key)
       )
       AND t.created_at >= DATE_SUB(s.sale_date, INTERVAL 14 DAY)
       AND t.created_at < DATE_ADD(s.sale_date, INTERVAL 1 DAY)
       AND t.event_type IN (${placeholders})
     WHERE s.sale_date >= ? AND s.sale_date < ?
     ${dealerFilter}
     GROUP BY s.id, s.dealership_id, s.vin, s.stock_number, s.sale_date, s.customer_key, s.customer_id`,
    [...QUALIFYING_EVENT_TYPES, ...params]
  );

  const byDealer = new Map();
  for (const row of rows) {
    const influenced = Number(row.qualifying_event_count) > 0;
    const events = row.audit_events ? String(row.audit_events).split(",") : [];
    const resultId = `inf_${row.sale_id}`.slice(0, 64);
    await pool.query(
      `INSERT INTO influence_results
        (id, sale_id, dealership_id, vin, stock_number, sale_date, qualifying_event_count, audit_events, influenced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        qualifying_event_count = VALUES(qualifying_event_count),
        audit_events = VALUES(audit_events),
        influenced = VALUES(influenced)`,
      [
        resultId,
        row.sale_id,
        row.dealership_id,
        row.vin,
        row.stock_number,
        row.sale_date,
        Number(row.qualifying_event_count) || 0,
        JSON.stringify(events),
        influenced ? 1 : 0,
      ]
    );
    if (!row.dealership_id) continue;
    if (!byDealer.has(row.dealership_id)) byDealer.set(row.dealership_id, []);
    byDealer.get(row.dealership_id).push({ ...row, influenced, events });
  }

  const invoices = [];
  for (const [dealerId, items] of byDealer) {
    const invoice = await writeInvoice(dealerId, periodMonth, items);
    if (invoice) invoices.push(invoice);
  }
  return { periodMonth, invoices };
}

async function writeInvoice(dealershipId, periodMonth, items) {
  const [existingRows] = await pool.query(
    `SELECT * FROM billing_invoices WHERE dealership_id = ? AND period = ? LIMIT 1`,
    [dealershipId, periodMonth]
  );
  let invoiceId = existingRows[0]?.id;
  if (existingRows[0] && existingRows[0].status !== "PENDING") {
    return mapInvoice(existingRows[0]);
  }
  if (!invoiceId) {
    invoiceId = `inv_${periodMonth.replace("-", "")}_${randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO billing_invoices (id, dealership_id, period, influenced_sales, amount_due, status)
       VALUES (?, ?, ?, 0, 0, 'PENDING')`,
      [invoiceId, dealershipId, periodMonth]
    );
  } else {
    await pool.query("DELETE FROM billing_line_items WHERE invoice_id = ?", [invoiceId]);
  }

  let influencedSales = 0;
  for (const item of items) {
    if (item.influenced) influencedSales += 1;
    await pool.query(
      `INSERT INTO billing_line_items
        (id, invoice_id, sale_id, stock_number, vin, sale_date, influenced, qualifying_event_count, event_types)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `bli_${randomUUID().slice(0, 8)}`,
        invoiceId,
        item.sale_id,
        item.stock_number,
        item.vin,
        item.sale_date,
        item.influenced ? 1 : 0,
        Number(item.qualifying_event_count) || 0,
        JSON.stringify(item.events),
      ]
    );
  }
  const amountDue = influencedSales * PRICE_PER_INFLUENCED_SALE;
  await pool.query(
    `UPDATE billing_invoices SET influenced_sales = ?, amount_due = ? WHERE id = ?`,
    [influencedSales, amountDue, invoiceId]
  );
  const [saved] = await pool.query("SELECT * FROM billing_invoices WHERE id = ? LIMIT 1", [
    invoiceId,
  ]);
  return mapInvoice(saved[0]);
}

function mapInvoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    dealershipId: row.dealership_id,
    periodMonth: row.period,
    influencedSales: Number(row.influenced_sales) || 0,
    amountDue: Number(row.amount_due) || 0,
    pricePerSale: PRICE_PER_INFLUENCED_SALE,
    status: row.status,
    createdAt: row.created_at,
  };
}

function parseJson(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

async function listInvoices({ dealershipId = null, page = 1, limit = 20 } = {}) {
  const where = [];
  const params = [];
  if (dealershipId) {
    where.push("i.dealership_id = ?");
    params.push(dealershipId);
  }
  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM billing_invoices i ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const [rows] = await pool.query(
    `SELECT i.*, d.name AS dealership_name
     FROM billing_invoices i
     LEFT JOIN dealerships d ON d.id = i.dealership_id
     ${whereClause}
     ORDER BY i.period DESC, i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );
  return {
    invoices: rows.map((row) => ({
      ...mapInvoice(row),
      dealership: row.dealership_name || null,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

async function getInvoice(id, dealershipId = null) {
  const [rows] = await pool.query(
    `SELECT i.*, d.name AS dealership_name
     FROM billing_invoices i
     LEFT JOIN dealerships d ON d.id = i.dealership_id
     WHERE i.id = ? LIMIT 1`,
    [id]
  );
  const invoice = rows[0];
  if (!invoice) throw new AppError("Invoice not found", 404);
  if (dealershipId && invoice.dealership_id !== dealershipId) {
    throw new AppError("Invoice not found", 404);
  }
  const [items] = await pool.query(
    `SELECT * FROM billing_line_items WHERE invoice_id = ? ORDER BY sale_date DESC`,
    [id]
  );
  return {
    invoice: { ...mapInvoice(invoice), dealership: invoice.dealership_name || null },
    lineItems: items.map(mapLineItem),
  };
}

function mapLineItem(row) {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    saleId: row.sale_id,
    stockNumber: row.stock_number,
    vin: row.vin,
    saleDate: row.sale_date,
    influenced: Number(row.influenced) === 1,
    events: parseJson(row.event_types),
    qualifyingEventCount: Number(row.qualifying_event_count) || 0,
    amount: Number(row.influenced) === 1 ? PRICE_PER_INFLUENCED_SALE : 0,
  };
}

async function getLineItem(id, dealershipId = null) {
  const [rows] = await pool.query(
    `SELECT li.*, i.dealership_id, s.customer_id, s.customer_key, s.customer_name
     FROM billing_line_items li
     JOIN billing_invoices i ON i.id = li.invoice_id
     LEFT JOIN stg_sold_units s ON s.id = li.sale_id
     WHERE li.id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) throw new AppError("Line item not found", 404);
  if (dealershipId && row.dealership_id !== dealershipId) {
    throw new AppError("Line item not found", 404);
  }
  const events = await listEventsForSale({
    customerId: row.customer_id,
    customerKey: row.customer_key,
    saleDate: row.sale_date,
  });
  const transcript = events.map((event) => ({
    eventType: event.eventType,
    message: event.message,
    eventAt: event.eventAt,
  }));
  return {
    lineItem: mapLineItem(row),
    customerName: row.customer_name || null,
    transcript,
  };
}

module.exports = {
  PRICE_PER_INFLUENCED_SALE,
  ingestSoldLog,
  runAttribution,
  listInvoices,
  getInvoice,
  getLineItem,
};
