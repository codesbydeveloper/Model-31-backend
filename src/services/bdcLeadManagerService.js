const { randomUUID } = require("crypto");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const MerchandisingVehicle = require("../models/MerchandisingVehicle");
const AppError = require("../utils/AppError");
const { normalizePhone } = require("../utils/smsPhone");

const CHARGE_AMOUNT = 31;

function headerKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function parseCsv(text) {
  const src = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => String(value || "").trim()));
}

function rowsToObjects(text) {
  const table = parseCsv(text);
  if (!table.length) return [];
  const headers = table[0].map(headerKey);
  return table.slice(1).map((cells) => {
    const item = {};
    headers.forEach((key, index) => {
      if (key) item[key] = String(cells[index] || "").trim();
    });
    return item;
  });
}

function cell(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function fileText(file) {
  if (!file?.buffer) throw new AppError("CSV file is required", 400);
  return file.buffer.toString("utf8");
}

function bdcLead(lead) {
  const sold = String(lead.status || "").toUpperCase() === "CLOSED";
  return {
    id: lead.id,
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    customerEmail: lead.customerEmail || "",
    vehicleInterest: lead.vehicle || "",
    tradeIn: lead.tradeIn || "",
    status: lead.status,
    canMarkSold: !sold,
    markSoldUrl: `/api/dealership/crm/leads/${lead.id}/mark-sold`,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

async function getOverview(dealershipId, query = {}) {
  const [result, stats] = await Promise.all([
    Lead.list({
      dealershipId,
      search: query.search || "",
      page: query.page,
      limit: query.limit || 50,
    }),
    Lead.getStats(dealershipId),
  ]);
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM merchandising_vehicles WHERE dealership_id = ?`,
    [dealershipId]
  );
  return {
    pageTitle: "BDC Lead Manager",
    description: "Upload the leads and inventory files from the dealership's own system. No CRM connection.",
    leadsCount: stats.total || 0,
    vehiclesCount: Number(countRows[0]?.total) || 0,
    chargesCount: await countCharges(dealershipId),
    leads: (result.leads || result.items || []).map(bdcLead),
    pagination: result.pagination,
    uploadLeadsUrl: "/api/dealership/crm/leads/upload",
    uploadInventoryUrl: "/api/dealership/crm/inventory/upload",
    uploadSoldUrl: "/api/dealership/crm/sold/upload",
    sampleLeadsUrl: "/api/dealership/crm/leads/sample",
    sampleInventoryUrl: "/api/dealership/crm/inventory/sample",
    sampleSoldUrl: "/api/dealership/crm/sold/sample",
    chargesUrl: "/api/dealership/crm/sold",
    leadColumns: ["name", "phone", "email", "vehicle_interest", "trade_in"],
    inventoryColumns: [
      "vin",
      "stock_number",
      "year",
      "make",
      "model",
      "trim",
      "mileage",
      "color",
      "price",
    ],
    soldColumns: ["buyer_name", "buyer_phone", "vin", "sold_date"],
  };
}

async function uploadLeads(dealershipId, file) {
  const rows = rowsToObjects(fileText(file));
  if (!rows.length) throw new AppError("The leads CSV has no data rows", 400);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    const name = cell(row, "name", "customer_name");
    const phone = normalizePhone(cell(row, "phone", "customer_phone"));
    const vehicle = cell(row, "vehicle_interest", "vehicle");
    if (!name || !phone || !vehicle) {
      skipped += 1;
      errors.push("Skipped a row missing name, phone, or vehicle_interest");
      continue;
    }
    const email = cell(row, "email", "customer_email");
    const tradeIn = cell(row, "trade_in", "tradein");
    const match = await Lead.findByPhone(dealershipId, phone);
    if (match) {
      await Lead.update(match.id, {
        ...match,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || match.customerEmail,
        vehicle,
        tradeIn: tradeIn || match.tradeIn,
        source: match.source || "CSV",
      });
      updated += 1;
    } else {
      await Lead.create({
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        vehicle,
        tradeIn: tradeIn || null,
        dealershipId,
        source: "CSV",
        pipeline: "DEALERSHIP",
        status: "NEW",
        score: 50,
        tier: "Tier C",
      });
      created += 1;
    }
  }

  const overview = await getOverview(dealershipId);
  return {
    message: `Leads uploaded. ${created} new, ${updated} updated, ${skipped} skipped.`,
    created,
    updated,
    skipped,
    errors: errors.slice(0, 8),
    ...overview,
  };
}

async function uploadInventory(dealershipId, file) {
  const rows = rowsToObjects(fileText(file));
  if (!rows.length) throw new AppError("The inventory CSV has no data rows", 400);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const vin = cell(row, "vin").toUpperCase();
    const year = Number(cell(row, "year")) || null;
    const make = cell(row, "make");
    const model = cell(row, "model");
    const price = Number(String(cell(row, "price")).replace(/[^0-9.]/g, ""));
    if (!vin || !year || !make || !model || !(price > 0)) {
      skipped += 1;
      continue;
    }
    const trim = cell(row, "trim");
    const color = cell(row, "color");
    const mileageRaw = cell(row, "mileage", "miles");
    const mileage = mileageRaw ? Number(String(mileageRaw).replace(/[^0-9]/g, "")) : null;
    const stockNumber = cell(row, "stock_number", "stock");
    let existing = await MerchandisingVehicle.findById(vin, dealershipId);
    if (!existing && stockNumber) {
      existing = await MerchandisingVehicle.findById(stockNumber, dealershipId);
    }
    const vehicleName = [year, make, model, trim || existing?.trim]
      .filter(Boolean)
      .join(" ");
    const payload = {
      dealershipId,
      stockNumber: stockNumber || existing?.stockNumber || undefined,
      vin,
      year,
      make,
      model,
      trim: trim || existing?.trim || null,
      color: color || existing?.color || null,
      mileage: Number.isFinite(mileage) ? mileage : existing?.mileage ?? null,
      vehicle: vehicleName,
      price,
      status: existing?.status || "LIVE",
    };
    if (existing && existing.dealershipId === dealershipId) {
      await MerchandisingVehicle.update(existing.id, payload);
      updated += 1;
    } else {
      try {
        await MerchandisingVehicle.create(payload);
        created += 1;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          skipped += 1;
          continue;
        }
        throw err;
      }
    }
  }

  const overview = await getOverview(dealershipId);
  return {
    message: `Inventory uploaded. ${created} new, ${updated} updated, ${skipped} skipped.`,
    created,
    updated,
    skipped,
    ...overview,
  };
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function parseSoldDate(raw) {
  const text = String(raw || "").trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;
  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (us) return `${us[3]}-${pad2(us[1])}-${pad2(us[2])}`;
  return "";
}

function normalizeVin(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 17);
}

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function mapCharge(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.lead_id || null,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    vin: row.vin || "",
    soldDate: row.sold_date,
    amount: Number(row.amount) || CHARGE_AMOUNT,
    source: row.source,
    createdAt: row.created_at,
  };
}

async function countCharges(dealershipId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM model31_charges WHERE dealership_id = ?`,
    [dealershipId]
  );
  return Number(rows[0]?.total) || 0;
}

async function findAiLeadByPhone(dealershipId, phone) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (!phone && digits.length !== 10) return null;
  const [rows] = await pool.query(
    `SELECT l.id
     FROM leads l
     WHERE l.dealership_id = ?
       AND (
         l.customer_phone = ?
         OR (? <> '' AND RIGHT(REPLACE(REPLACE(REPLACE(l.customer_phone, '+', ''), '-', ''), ' ', ''), 10) = ?)
       )
       AND EXISTS (
         SELECT 1 FROM conversation_messages cm
         WHERE cm.lead_id = l.id AND cm.sender_type IN ('CUSTOMER', 'AI')
       )
     ORDER BY l.updated_at DESC
     LIMIT 1`,
    [dealershipId, phone || "", digits, digits]
  );
  if (!rows[0]) return null;
  return Lead.findById(rows[0].id);
}

async function addCharge({ dealershipId, lead, buyerName, buyerPhone, vin, soldDate, source }) {
  const id = `chg_${randomUUID().slice(0, 8)}`;
  try {
    await pool.query(
      `INSERT INTO model31_charges
        (id, dealership_id, lead_id, buyer_name, buyer_phone, vin, sold_date, amount, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        dealershipId,
        lead.id,
        buyerName || lead.customerName,
        buyerPhone || lead.customerPhone,
        vin || "",
        soldDate,
        CHARGE_AMOUNT,
        source,
      ]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return { charged: false, duplicate: true };
    throw err;
  }
  if (String(lead.status || "").toUpperCase() !== "CLOSED") {
    await Lead.updateStatus(lead.id, "CLOSED");
  }
  return { charged: true, duplicate: false };
}

async function listCharges(dealershipId, query = {}) {
  const safePage = Math.max(1, Number(query.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const total = await countCharges(dealershipId);
  const [rows] = await pool.query(
    `SELECT id, dealership_id, lead_id, buyer_name, buyer_phone, vin,
            DATE_FORMAT(sold_date, '%Y-%m-%d') AS sold_date,
            amount, source, created_at
     FROM model31_charges
     WHERE dealership_id = ?
     ORDER BY sold_date DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [dealershipId, safeLimit, offset]
  );
  return {
    charges: rows.map(mapCharge),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
    },
  };
}

async function uploadSold(dealershipId, file) {
  const rows = rowsToObjects(fileText(file));
  if (!rows.length) throw new AppError("The sold CSV has no data rows", 400);
  let charged = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const row of rows) {
    const name = cell(row, "buyer_name", "name", "customer_name");
    const phone = normalizePhone(cell(row, "buyer_phone", "phone", "customer_phone"));
    const vin = normalizeVin(cell(row, "vin"));
    const soldDate = parseSoldDate(cell(row, "sold_date", "sale_date", "date"));
    if (!name || !phone || !vin || !soldDate) {
      skipped += 1;
      continue;
    }
    const lead = await findAiLeadByPhone(dealershipId, phone);
    if (!lead) {
      skipped += 1;
      continue;
    }
    const result = await addCharge({
      dealershipId,
      lead,
      buyerName: name,
      buyerPhone: phone,
      vin,
      soldDate,
      source: "SOLD_FILE",
    });
    if (result.duplicate) duplicates += 1;
    else if (result.charged) charged += 1;
    else skipped += 1;
  }

  const list = await listCharges(dealershipId, { page: 1, limit: 10 });
  return {
    message: `Sold file uploaded. ${charged} $31 charge${charged === 1 ? "" : "s"}, ${duplicates} already billed, ${skipped} skipped.`,
    charged,
    duplicates,
    skipped,
    amount: CHARGE_AMOUNT,
    ...list,
  };
}

async function markSold(dealershipId, leadId) {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.dealershipId !== dealershipId) {
    throw new AppError("Lead not found", 404);
  }
  if (String(lead.status).toUpperCase() === "CLOSED") {
    throw new AppError("This lead is already marked sold", 400);
  }
  const updated = await Lead.updateStatus(leadId, "CLOSED");
  const aiLead = await findAiLeadByPhone(dealershipId, lead.customerPhone);
  if (aiLead && aiLead.id === lead.id) {
    await addCharge({
      dealershipId,
      lead: updated,
      buyerName: updated.customerName,
      buyerPhone: updated.customerPhone,
      vin: normalizeVin(updated.vehicle).length >= 11 ? normalizeVin(updated.vehicle) : "",
      soldDate: todayStamp(),
      source: "MARK_SOLD",
    });
  }
  return {
    message: "Lead marked sold",
    lead: bdcLead(updated),
  };
}

const SAMPLE_LEADS_CSV =
  "name,phone,email,vehicle_interest,trade_in\n" +
  "John Smith,+13057771234,john@gmail.com,Honda Accord,2015 Honda Civic\n" +
  "Mary Lee,+13058885678,,Toyota RAV4,\n";

const SAMPLE_INVENTORY_CSV =
  "vin,stock_number,year,make,model,trim,mileage,color,price\n" +
  "1HGCV1F3XPA000001,A1023,2023,Honda,Accord,LX,12500,Silver,24500\n" +
  "2T3P1RFV5PW000002,T2047,2024,Toyota,RAV4,XLE,8200,Blue,29800\n" +
  "3FA6P0H70ER000003,,2022,Ford,Fusion,,,White,18900\n";

const SAMPLE_SOLD_CSV =
  "buyer_name,buyer_phone,vin,sold_date\n" +
  "John Smith,+13057771234,1HGCV1F3XPA000001,2026-11-21\n" +
  "Mary Lee,+13058885678,2T3P1RFV5PW000002,2026-11-21\n";

function sampleLeadsCsv() {
  return {
    filename: "sample-leads.csv",
    contentType: "text/csv; charset=utf-8",
    content: `\uFEFF${SAMPLE_LEADS_CSV}`,
  };
}

function sampleInventoryCsv() {
  return {
    filename: "sample-inventory.csv",
    contentType: "text/csv; charset=utf-8",
    content: `\uFEFF${SAMPLE_INVENTORY_CSV}`,
  };
}

function sampleSoldCsv() {
  return {
    filename: "sample-sold.csv",
    contentType: "text/csv; charset=utf-8",
    content: `\uFEFF${SAMPLE_SOLD_CSV}`,
  };
}

module.exports = {
  getOverview,
  uploadLeads,
  uploadInventory,
  uploadSold,
  listCharges,
  markSold,
  sampleLeadsCsv,
  sampleInventoryCsv,
  sampleSoldCsv,
};
