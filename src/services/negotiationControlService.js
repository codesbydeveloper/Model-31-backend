const AppError = require("../utils/AppError");

const NOTICE =
  "Model 31 cannot negotiate outside manager-defined limits. If negotiation limits are not configured, price negotiation is unavailable.";

const STATUSES = ["ACTIVE", "INACTIVE"];

function money(n) {
  return `$${Number(n).toLocaleString("en-US")}`;
}

function paymentRange(min, max) {
  return `$${min}-$${max}`;
}

function tradeRange(min, max) {
  return `$${Number(min).toLocaleString("en-US")}-$${Number(max).toLocaleString("en-US")}`;
}

const INITIAL_RECORDS = [];

let records = INITIAL_RECORDS.map((r) => ({ ...r }));

function findRecord(id) {
  return records.find((r) => r.id === id) || null;
}

function mapTableRow(item) {
  return {
    id: item.id,
    vin: item.vin,
    vehicle: item.vehicle,
    minimumPrice: item.minimumPrice,
    minimumPriceFormatted: money(item.minimumPrice),
    maximumDiscount: item.maximumDiscount,
    maximumDiscountFormatted: money(item.maximumDiscount),
    payment: paymentRange(item.minimumPayment, item.maximumPayment),
    trade: tradeRange(item.minimumTradeValue, item.maximumTradeValue),
    status: item.status,
    template: item.template,
    actions: {
      canView: true,
      canEdit: true,
      viewPath: `/api/super-admin/negotiation-control/${item.id}`,
      editPath: `/api/super-admin/negotiation-control/${item.id}?edit=1`,
      frontendView: `/super-admin/negotiation-control/${item.id}`,
      frontendEdit: `/super-admin/negotiation-control/${item.id}?edit=1`,
    },
  };
}

function mapForm(item, mode) {
  return {
    id: item.id,
    vehicle: item.vehicle,
    vin: item.vin,
    msrp: item.msrp,
    currentPrice: item.currentPrice,
    minimumPrice: item.minimumPrice,
    maximumDiscount: item.maximumDiscount,
    minimumPayment: item.minimumPayment,
    maximumPayment: item.maximumPayment,
    minimumTradeValue: item.minimumTradeValue,
    maximumTradeValue: item.maximumTradeValue,
    allowedIncentives: item.allowedIncentives,
    allowedFees: item.allowedFees,
    status: item.status,
    template: item.template,
    mode,
    readOnly: mode === "view",
  };
}

function listRecords(query = {}) {
  const search = String(query.search || "").trim().toLowerCase();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 8));

  let filtered = [...records];

  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.vin.toLowerCase().includes(search) ||
        r.vehicle.toLowerCase().includes(search) ||
        r.template.toLowerCase().includes(search)
    );
  }

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    pageTitle: "Negotiation Control",
    description:
      "Define the limits Model 31 may use when advanced deal assistance is enabled.",
    notice: NOTICE,
    search: search || "",
    rows: filtered.slice(start, start + limit).map(mapTableRow),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      showingFrom: total === 0 ? 0 : start + 1,
      showingTo: Math.min(start + limit, total),
      label: `Showing ${total === 0 ? 0 : start + 1}-${Math.min(start + limit, total)} of ${total}`,
    },
  };
}

function getRecord(id, query = {}) {
  const item = findRecord(id);
  if (!item) throw new AppError("Negotiation control record not found", 404);

  const editFlag = String(query.edit || "").trim();
  const mode =
    editFlag === "1" || String(query.mode || "").toLowerCase() === "edit"
      ? "edit"
      : "view";

  return {
    pageTitle: item.vehicle,
    subtitle:
      mode === "edit"
        ? `VIN: ${item.vin} · Edit Limits`
        : `VIN: ${item.vin}`,
    status: item.status,
    notice: NOTICE,
    record: mapForm(item, mode),
    statusOptions: STATUSES,
    backPath: "/super-admin/negotiation-control",
    actions: {
      canSave: mode === "edit",
      savePath: `/api/super-admin/negotiation-control/${item.id}`,
    },
  };
}

function toNumber(value, field) {
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) {
    throw new AppError(`${field} must be a valid number`, 400);
  }
  return n;
}

function updateRecord(id, body = {}) {
  const item = findRecord(id);
  if (!item) throw new AppError("Negotiation control record not found", 404);

  if (body.status && !STATUSES.includes(String(body.status).toUpperCase())) {
    throw new AppError("status must be ACTIVE or INACTIVE", 400);
  }

  const next = {
    ...item,
    vehicle:
      body.vehicle !== undefined ? String(body.vehicle).trim() : item.vehicle,
    vin: body.vin !== undefined ? String(body.vin).trim() : item.vin,
    msrp: body.msrp !== undefined ? toNumber(body.msrp, "msrp") : item.msrp,
    currentPrice:
      body.currentPrice !== undefined
        ? toNumber(body.currentPrice, "currentPrice")
        : item.currentPrice,
    minimumPrice:
      body.minimumPrice !== undefined
        ? toNumber(body.minimumPrice, "minimumPrice")
        : item.minimumPrice,
    maximumDiscount:
      body.maximumDiscount !== undefined
        ? toNumber(body.maximumDiscount, "maximumDiscount")
        : item.maximumDiscount,
    minimumPayment:
      body.minimumPayment !== undefined
        ? toNumber(body.minimumPayment, "minimumPayment")
        : item.minimumPayment,
    maximumPayment:
      body.maximumPayment !== undefined
        ? toNumber(body.maximumPayment, "maximumPayment")
        : item.maximumPayment,
    minimumTradeValue:
      body.minimumTradeValue !== undefined
        ? toNumber(body.minimumTradeValue, "minimumTradeValue")
        : item.minimumTradeValue,
    maximumTradeValue:
      body.maximumTradeValue !== undefined
        ? toNumber(body.maximumTradeValue, "maximumTradeValue")
        : item.maximumTradeValue,
    allowedIncentives:
      body.allowedIncentives !== undefined
        ? String(body.allowedIncentives).trim()
        : item.allowedIncentives,
    allowedFees:
      body.allowedFees !== undefined
        ? String(body.allowedFees).trim()
        : item.allowedFees,
    status:
      body.status !== undefined
        ? String(body.status).toUpperCase()
        : item.status,
  };

  if (!next.vehicle) throw new AppError("Vehicle is required", 400);
  if (!next.vin) throw new AppError("VIN is required", 400);
  if (next.minimumPrice > next.currentPrice) {
    throw new AppError("Minimum price cannot be higher than current price", 400);
  }
  if (next.minimumPayment > next.maximumPayment) {
    throw new AppError(
      "Minimum payment cannot be higher than maximum payment",
      400
    );
  }
  if (next.minimumTradeValue > next.maximumTradeValue) {
    throw new AppError(
      "Minimum trade value cannot be higher than maximum trade value",
      400
    );
  }

  records = records.map((r) => (r.id === id ? next : r));

  return {
    message: "Negotiation limits saved",
    record: mapForm(next, "view"),
  };
}

module.exports = {
  listRecords,
  getRecord,
  updateRecord,
};
