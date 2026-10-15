const fs = require("fs");
const path = require("path");
const MerchandisingVehicle = require("../models/MerchandisingVehicle");
const Dealership = require("../models/Dealership");
const AppError = require("../utils/AppError");

const PRICE_OPTIONS = [
  "All prices",
  "Under $50,000",
  "$50,000 – $70,000",
  "Over $70,000",
];

const STATUS_ALIASES = {
  AVAILABLE: "LIVE",
  PENDING: "NEEDS_PHOTOS",
  RESERVED: "PROCESSED",
};

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function storedStatus(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "All statuses") return null;
  const merchandising = MerchandisingVehicle.normalizeStatus(raw, null);
  if (merchandising) return merchandising;
  const alias = STATUS_ALIASES[raw.toUpperCase()];
  if (alias) return alias;
  if (raw.toUpperCase() === "SOLD") return null;
  return raw;
}

function priceBounds(filter) {
  if (!filter || filter === "All prices") return {};
  if (filter === "Under $50,000") return { maxPrice: 49999.99 };
  if (filter === "$50,000 – $70,000" || filter === "$50,000 - $70,000") {
    return { minPrice: 50000, maxPrice: 70000 };
  }
  if (filter === "Over $70,000") return { priceAbove: 70000 };
  return {};
}

function toAdminRow(vehicle) {
  return {
    id: vehicle.id,
    vin: vehicle.vin || "",
    vehicle: vehicle.vehicle,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: "",
    price: vehicle.price,
    status: vehicle.status,
    statusLabel: vehicle.statusLabel,
    dealership: vehicle.dealershipName || "",
    dealershipId: vehicle.dealershipId,
    stockNumber: vehicle.stockNumber,
    photos: vehicle.photos,
    images: vehicle.images || [],
    daysInInventory: vehicle.daysInStock,
    lastUpdated: dateOnly(vehicle.updatedAt),
    actions: {
      view: `/api/super-admin/inventory/${vehicle.id}`,
    },
  };
}

async function getOverview() {
  const counts = await MerchandisingVehicle.overviewCounts();
  return {
    metrics: {
      totalVehicles: counts.total,
      available: counts.live,
      reserved: counts.processed,
      sold: 0,
      lowInventory: counts.aged,
      priceChanges: 0,
    },
    insights: [],
  };
}

async function listVehicles(query = {}) {
  const statusFilter = String(query.status || "").trim();
  const stored = storedStatus(statusFilter);
  if (statusFilter && statusFilter !== "All statuses" && statusFilter.toUpperCase() === "SOLD") {
    const dealerships = await Dealership.listAllOptions();
    const makes = await MerchandisingVehicle.distinctMakes();
    return {
      ...(await getOverview()),
      filters: {
        statuses: ["All statuses", ...Object.keys(MerchandisingVehicle.STATUS_LABELS)],
        dealerships: ["All dealerships", ...dealerships.map((item) => item.name)],
        makes: ["All makes", ...makes],
        prices: PRICE_OPTIONS,
      },
      vehicles: [],
      pagination: {
        page: Math.max(1, Number(query.page) || 1),
        limit: Math.min(100, Math.max(1, Number(query.limit) || 8)),
        total: 0,
        totalPages: 0,
      },
    };
  }

  const data = await MerchandisingVehicle.listAll({
    status: stored,
    dealership: String(query.dealership || "").trim(),
    make: String(query.make || "").trim(),
    search: String(query.search || "").trim(),
    page: query.page,
    limit: query.limit || 8,
    ...priceBounds(String(query.price || query.priceRange || "").trim()),
  });
  const [overview, dealerships, makes] = await Promise.all([
    getOverview(),
    Dealership.listAllOptions(),
    MerchandisingVehicle.distinctMakes(),
  ]);

  return {
    ...overview,
    filters: {
      statuses: ["All statuses", ...Object.keys(MerchandisingVehicle.STATUS_LABELS)],
      dealerships: ["All dealerships", ...dealerships.map((item) => item.name)],
      makes: ["All makes", ...makes],
      prices: PRICE_OPTIONS,
    },
    vehicles: data.vehicles.map(toAdminRow),
    pagination: data.pagination,
  };
}

function imageUrlsFromFiles(files = []) {
  const urls = [];
  for (const file of files || []) {
    if (file?.filename) urls.push(`/uploads/vehicles/${file.filename}`);
  }
  if (urls.length > 10) throw new AppError("You can add up to 10 images", 400);
  return urls;
}

async function createVehicle(body = {}, files = []) {
  const make = String(body.make || "").trim();
  const model = String(body.model || "").trim();
  const vehicleName = String(body.vehicle || "").trim();
  const year = Number(body.year) || null;
  if (!vehicleName && !make && !model) {
    throw new AppError("Make and model are required", 400);
  }

  const requested = String(body.status || "").trim();
  const status = storedStatus(requested) || "NEEDS_PHOTOS";
  if (requested && requested.toUpperCase() === "SOLD") {
    throw new AppError("status must be one of: NEEDS_PHOTOS, PROCESSED, LIVE", 400);
  }
  if (requested && !MerchandisingVehicle.normalizeStatus(status)) {
    throw new AppError("status must be one of: NEEDS_PHOTOS, PROCESSED, LIVE", 400);
  }

  const dealershipName = String(body.dealership || "").trim();
  let dealership = dealershipName ? await Dealership.findByName(dealershipName) : null;
  if (dealershipName && !dealership) {
    throw new AppError("Dealership not found", 404);
  }
  if (!dealership) {
    const options = await Dealership.listAllOptions();
    dealership = options[0] ? await Dealership.findById(options[0].id) : null;
  }
  if (!dealership) throw new AppError("Dealership not found", 404);

  const imageUrls = imageUrlsFromFiles(files);
  const created = await MerchandisingVehicle.create({
    dealershipId: dealership.id,
    vin: body.vin,
    year,
    make,
    model,
    vehicle: vehicleName,
    price: body.price,
    photos: imageUrls.length,
    status,
    daysInStock: body.daysInInventory || body.daysInStock,
  });
  if (imageUrls.length) await MerchandisingVehicle.addImages(created.id, imageUrls);
  const vehicle = await MerchandisingVehicle.findById(created.id);
  return { message: "Vehicle created", vehicle: toAdminRow(vehicle) };
}

async function updateVehicle(vehicleId, body = {}, files = []) {
  const existing = await MerchandisingVehicle.findById(vehicleId);
  if (!existing) throw new AppError("Vehicle not found", 404);

  const make = body.make !== undefined ? String(body.make || "").trim() : existing.make;
  const model = body.model !== undefined ? String(body.model || "").trim() : existing.model;
  const year =
    body.year !== undefined && String(body.year).trim() !== ""
      ? Number(body.year) || null
      : existing.year;
  const vehicleName =
    String(body.vehicle || "").trim() || [year, make, model].filter(Boolean).join(" ");

  let status = existing.status;
  const requested = String(body.status || "").trim();
  if (requested) {
    const stored = storedStatus(requested);
    if (
      requested.toUpperCase() === "SOLD" ||
      !stored ||
      !MerchandisingVehicle.normalizeStatus(stored)
    ) {
      throw new AppError("status must be one of: NEEDS_PHOTOS, PROCESSED, LIVE", 400);
    }
    status = stored;
  }

  const imageUrls = imageUrlsFromFiles(files);
  let dealershipId = existing.dealershipId;
  const dealershipName = String(body.dealership || "").trim();
  if (dealershipName) {
    const dealership = await Dealership.findByName(dealershipName);
    if (!dealership) throw new AppError("Dealership not found", 404);
    dealershipId = dealership.id;
  }
  await MerchandisingVehicle.update(vehicleId, {
    vin: body.vin !== undefined ? String(body.vin || "").trim() : existing.vin,
    year,
    make,
    model,
    vehicle: vehicleName,
    price:
      body.price !== undefined && String(body.price).trim() !== ""
        ? body.price
        : existing.price,
    status,
    dealershipId,
  });
  if (imageUrls.length) await MerchandisingVehicle.addImages(vehicleId, imageUrls);
  const vehicle = await MerchandisingVehicle.findById(vehicleId);
  return { message: "Vehicle updated", vehicle: toAdminRow(vehicle) };
}

function removeStoredImage(url) {
  if (!url || !String(url).startsWith("/uploads/vehicles/")) return;
  const filePath = path.join(__dirname, "../../uploads/vehicles", path.basename(url));
  fs.unlink(filePath, () => {});
}

async function deleteVehicleImage(vehicleId, imageId) {
  const existing = await MerchandisingVehicle.findById(vehicleId);
  if (!existing) throw new AppError("Vehicle not found", 404);
  const removed = await MerchandisingVehicle.deleteImage(vehicleId, imageId);
  if (!removed) throw new AppError("Image not found", 404);
  removeStoredImage(removed.url);
  const vehicle = await MerchandisingVehicle.findById(vehicleId);
  return { message: "Image deleted", vehicle: toAdminRow(vehicle) };
}

async function deleteVehicle(id) {
  const existing = await MerchandisingVehicle.findById(id);
  if (!existing) throw new AppError("Vehicle not found", 404);
  const urls = await MerchandisingVehicle.listImageUrls(id);
  const deleted = await MerchandisingVehicle.deleteById(id, existing.dealershipId);
  if (!deleted) throw new AppError("Vehicle not found", 404);
  urls.forEach(removeStoredImage);
  return { message: "Vehicle deleted", id };
}

async function getVehicleDetail(vehicleId) {
  const vehicle = await MerchandisingVehicle.findById(vehicleId);
  if (!vehicle) throw new AppError("Vehicle not found", 404);
  const row = toAdminRow(vehicle);
  const changedOn = row.lastUpdated;

  return {
    vehicle: {
      id: row.id,
      title: [row.year, row.make, row.model].filter(Boolean).join(" ") || row.vehicle,
      subtitle: [row.vin, row.dealership].filter(Boolean).join(" · "),
      status: row.status,
      statusLabel: row.statusLabel,
      vin: row.vin,
      year: row.year,
      make: row.make,
      model: row.model,
      trim: row.trim,
      price: row.price,
      stockNumber: row.stockNumber,
      photos: row.photos,
      images: row.images,
      dealership: row.dealership,
      availability: row.status,
      daysInInventory: row.daysInInventory,
      lastUpdated: changedOn,
    },
    priceHistory: {
      summary: {
        original: row.price,
        current: row.price,
        changedOn,
      },
      items: [],
    },
    inventoryHistory: [],
  };
}

module.exports = {
  getOverview,
  listVehicles,
  getVehicleDetail,
  createVehicle,
  updateVehicle,
  deleteVehicleImage,
  deleteVehicle,
};
