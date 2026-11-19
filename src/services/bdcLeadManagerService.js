const pool = require("../config/database");
const Lead = require("../models/Lead");
const MerchandisingVehicle = require("../models/MerchandisingVehicle");
const AppError = require("../utils/AppError");
const { normalizePhone } = require("../utils/smsPhone");

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
    leads: (result.leads || result.items || []).map(bdcLead),
    pagination: result.pagination,
    uploadLeadsUrl: "/api/dealership/crm/leads/upload",
    uploadInventoryUrl: "/api/dealership/crm/inventory/upload",
    sampleLeadsUrl: "/api/dealership/crm/leads/sample",
    sampleInventoryUrl: "/api/dealership/crm/inventory/sample",
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

async function markSold(dealershipId, leadId) {
  const lead = await Lead.findById(leadId);
  if (!lead || lead.dealershipId !== dealershipId) {
    throw new AppError("Lead not found", 404);
  }
  if (String(lead.status).toUpperCase() === "CLOSED") {
    throw new AppError("This lead is already marked sold", 400);
  }
  const updated = await Lead.updateStatus(leadId, "CLOSED");
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

module.exports = {
  getOverview,
  uploadLeads,
  uploadInventory,
  markSold,
  sampleLeadsCsv,
  sampleInventoryCsv,
};
