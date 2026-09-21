const pool = require("../config/database");

const STATUS_LABELS = {
  NEEDS_PHOTOS: "Needs Photos",
  PROCESSED: "Processed",
  LIVE: "Live",
};

const STATUS_ALIASES = {
  NEEDS_PHOTOS: "NEEDS_PHOTOS",
  PROCESSED: "PROCESSED",
  LIVE: "LIVE",
  "NEEDS PHOTOS": "NEEDS_PHOTOS",
};

function normalizeStatus(value, fallback = "NEEDS_PHOTOS") {
  if (!value) return fallback;
  const key = String(value).trim().toUpperCase().replace(/-/g, " ");
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  const underscored = key.replace(/ /g, "_");
  if (STATUS_ALIASES[underscored]) return STATUS_ALIASES[underscored];
  return null;
}

function daysInStock(arrivedAt) {
  if (!arrivedAt) return 0;
  const start = arrivedAt instanceof Date ? arrivedAt : new Date(arrivedAt);
  if (Number.isNaN(start.getTime())) return 0;
  const today = new Date();
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.floor((todayUtc - startUtc) / 86400000));
}

function arrivedFromDays(days) {
  const n = Math.max(0, Number(days) || 0);
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mapVehicle(row, dealershipName = "") {
  if (!row) return null;
  const status = normalizeStatus(row.status) || "NEEDS_PHOTOS";
  const days = daysInStock(row.arrived_at);
  const year = row.year === null || row.year === undefined ? null : Number(row.year);
  const make = row.make || "";
  const model = row.model || "";
  const vehicle =
    row.vehicle ||
    [year, make, model].filter(Boolean).join(" ").trim();
  const name = dealershipName || row.dealership_name || "";

  return {
    id: row.id,
    dealershipId: row.dealership_id || null,
    dealershipName: name,
    stockNumber: row.stock_number,
    vin: row.vin || "",
    year,
    make,
    model,
    vehicle,
    price: Number(row.price) || 0,
    daysInStock: days,
    photos: Number(row.photos_count) || 0,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    aged: days >= 21,
    action: "Open",
    subtitle: name
      ? `${row.stock_number} · ${name}`
      : row.stock_number,
    listing: {
      stockNumber: row.stock_number,
      vin: row.vin || "",
      year,
      make,
      model,
      price: Number(row.price) || 0,
      daysInStock: days,
      photos: Number(row.photos_count) || 0,
      merchStatus: STATUS_LABELS[status] || status,
    },
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

const SELECT_VEHICLE = `
  SELECT v.*, d.name AS dealership_name
  FROM merchandising_vehicles v
  LEFT JOIN dealerships d ON d.id = v.dealership_id
`;

async function findById(id, dealershipId) {
  if (!id) return null;
  const where = ["(v.id = ? OR v.stock_number = ?)"];
  const params = [id, id];
  if (dealershipId) {
    where.push("v.dealership_id = ?");
    params.push(dealershipId);
  }
  const [rows] = await pool.query(
    `${SELECT_VEHICLE} WHERE ${where.join(" AND ")} LIMIT 1`,
    params
  );
  return mapVehicle(rows[0]);
}

async function nextId() {
  const [rows] = await pool.query(
    `SELECT MAX(CAST(SUBSTRING(id, 7) AS UNSIGNED)) AS max_n
     FROM merchandising_vehicles
     WHERE id LIKE 'inv_m_%'`
  );
  const next = (Number(rows[0]?.max_n) || 0) + 1;
  return `inv_m_${String(next).padStart(2, "0")}`;
}

async function nextStockNumber(dealershipId) {
  const [rows] = await pool.query(
    `SELECT MAX(CAST(SUBSTRING(stock_number, 4) AS UNSIGNED)) AS max_n
     FROM merchandising_vehicles
     WHERE dealership_id = ? AND stock_number LIKE 'ST-%'`,
    [dealershipId]
  );
  const next = (Number(rows[0]?.max_n) || 4411) + 1;
  return `ST-${next}`;
}

async function listByDealership(dealershipId, query = {}) {
  const where = ["v.dealership_id = ?"];
  const params = [dealershipId];

  if (query.status) {
    const statuses = String(query.status)
      .split(",")
      .map((s) => normalizeStatus(s.trim()))
      .filter(Boolean);
    if (statuses.length === 1) {
      where.push("v.status = ?");
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      where.push(`v.status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  }

  if (query.aged === true || query.aged === "true" || query.aged === "1") {
    where.push("DATEDIFF(CURDATE(), v.arrived_at) >= 21");
  }

  if (query.search) {
    where.push(
      "(v.id LIKE ? OR v.stock_number LIKE ? OR v.vehicle LIKE ? OR v.vin LIKE ? OR v.make LIKE ? OR v.model LIKE ?)"
    );
    const like = `%${query.search}%`;
    params.push(like, like, like, like, like, like);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM merchandising_vehicles v WHERE ${where.join(" AND ")}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(query.page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_VEHICLE} WHERE ${where.join(" AND ")}
     ORDER BY v.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );

  return {
    vehicles: rows.map((row) => mapVehicle(row)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

async function create(data) {
  const id = data.id || (await nextId());
  const stockNumber = data.stockNumber || (await nextStockNumber(data.dealershipId));
  const arrivedAt =
    data.arrivedAt || arrivedFromDays(data.daysInStock);
  await pool.query(
    `INSERT INTO merchandising_vehicles
      (id, dealership_id, stock_number, vin, year, make, model, vehicle, price, photos_count, status, arrived_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.dealershipId,
      stockNumber,
      data.vin || null,
      data.year || null,
      data.make || null,
      data.model || null,
      data.vehicle ||
        [data.year, data.make, data.model].filter(Boolean).join(" ").trim(),
      data.price || 0,
      data.photos || data.photosCount || 0,
      data.status || "NEEDS_PHOTOS",
      arrivedAt,
    ]
  );
  return findById(id, data.dealershipId);
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;
  const arrivedAt =
    data.arrivedAt !== undefined
      ? data.arrivedAt
      : data.daysInStock !== undefined
        ? arrivedFromDays(data.daysInStock)
        : arrivedFromDays(existing.daysInStock);
  await pool.query(
    `UPDATE merchandising_vehicles SET
      stock_number = ?,
      vin = ?,
      year = ?,
      make = ?,
      model = ?,
      vehicle = ?,
      price = ?,
      photos_count = ?,
      status = ?,
      arrived_at = ?
     WHERE id = ?`,
    [
      data.stockNumber !== undefined ? data.stockNumber : existing.stockNumber,
      data.vin !== undefined ? data.vin : existing.vin,
      data.year !== undefined ? data.year : existing.year,
      data.make !== undefined ? data.make : existing.make,
      data.model !== undefined ? data.model : existing.model,
      data.vehicle !== undefined ? data.vehicle : existing.vehicle,
      data.price !== undefined ? data.price : existing.price,
      data.photos !== undefined
        ? data.photos
        : data.photosCount !== undefined
          ? data.photosCount
          : existing.photos,
      data.status !== undefined ? data.status : existing.status,
      arrivedAt,
      existing.id,
    ]
  );
  return findById(existing.id, existing.dealershipId);
}

async function getDashboardCounts(dealershipId) {
  const [rows] = await pool.query(
    `SELECT
      SUM(CASE WHEN status = 'NEEDS_PHOTOS' THEN 1 ELSE 0 END) AS needs_photos,
      SUM(CASE WHEN status = 'PROCESSED' THEN 1 ELSE 0 END) AS processed,
      SUM(CASE WHEN status = 'LIVE' THEN 1 ELSE 0 END) AS live,
      SUM(CASE WHEN DATEDIFF(CURDATE(), arrived_at) >= 21 THEN 1 ELSE 0 END) AS aged
     FROM merchandising_vehicles
     WHERE dealership_id = ?`,
    [dealershipId]
  );
  const row = rows[0] || {};
  return {
    needsPhotos: Number(row.needs_photos) || 0,
    processed: Number(row.processed) || 0,
    live: Number(row.live) || 0,
    aged: Number(row.aged) || 0,
  };
}

module.exports = {
  STATUS_LABELS,
  normalizeStatus,
  findById,
  listByDealership,
  create,
  update,
  getDashboardCounts,
  mapVehicle,
};
