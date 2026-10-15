const fs = require("fs");
const path = require("path");
const MerchandisingVehicle = require("../models/MerchandisingVehicle");
const Dealership = require("../models/Dealership");
const AppError = require("../utils/AppError");

const STATUSES = Object.keys(MerchandisingVehicle.STATUS_LABELS);

async function requireDealership(dealershipId) {
  const dealership = await Dealership.findById(dealershipId);
  if (!dealership) throw new AppError("Dealership not found", 404);
  return dealership;
}

async function assertVehicle(id, dealershipId) {
  const vehicle = await MerchandisingVehicle.findById(id, dealershipId);
  if (!vehicle || vehicle.dealershipId !== dealershipId) {
    throw new AppError("Vehicle not found", 404);
  }
  return vehicle;
}

function parseStatus(value, fallback = "NEEDS_PHOTOS") {
  const status = MerchandisingVehicle.normalizeStatus(value, fallback);
  if (!status || !STATUSES.includes(status)) {
    throw new AppError(`status must be one of: ${STATUSES.join(", ")}`, 400);
  }
  return status;
}

function snapshotRow(vehicle) {
  return {
    id: vehicle.id,
    stockNumber: vehicle.stockNumber,
    vehicle: vehicle.vehicle,
    price: vehicle.price,
    daysInStock: vehicle.daysInStock,
    status: vehicle.status,
    statusLabel: vehicle.statusLabel,
    action: "Open",
  };
}

function listRow(vehicle) {
  return {
    id: vehicle.id,
    stockNumber: vehicle.stockNumber,
    vehicle: vehicle.vehicle,
    vin: vehicle.vin,
    price: vehicle.price,
    daysInStock: vehicle.daysInStock,
    photos: vehicle.photos,
    images: vehicle.images || [],
    status: vehicle.status,
    statusLabel: vehicle.statusLabel,
    action: "Open",
  };
}

async function getDashboard(dealershipId) {
  const dealership = await requireDealership(dealershipId);
  const stats = await MerchandisingVehicle.getDashboardCounts(dealershipId);
  const snapshot = await MerchandisingVehicle.listByDealership(dealershipId, {
    page: 1,
    limit: 5,
  });
  return {
    title: "Merchandising",
    subtitle: `${dealership.name} · Photos, listings, and aged stock`,
    stats: {
      needsPhotos: stats.needsPhotos,
      processed: stats.processed,
      live: stats.live,
      aged: stats.aged,
    },
    inventorySnapshot: snapshot.vehicles.map(snapshotRow),
  };
}

async function listInventory(dealershipId, query = {}) {
  await requireDealership(dealershipId);
  if (query.status) parseStatus(query.status);
  const data = await MerchandisingVehicle.listByDealership(dealershipId, query);
  return {
    title: "Merchandising Inventory",
    subtitle: "Vehicle photos, price, and listing status.",
    vehicles: data.vehicles.map(listRow),
    pagination: data.pagination,
    statuses: STATUSES.map((status) => ({
      value: status,
      label: MerchandisingVehicle.STATUS_LABELS[status],
    })),
  };
}

async function listNeedsPhotos(dealershipId, query = {}) {
  await requireDealership(dealershipId);
  const data = await MerchandisingVehicle.listByDealership(dealershipId, {
    ...query,
    status: "NEEDS_PHOTOS",
  });
  return {
    title: "Needs Photos",
    subtitle: "Vehicles that still need photo work.",
    vehicles: data.vehicles.map((vehicle) => ({
      id: vehicle.id,
      stockNumber: vehicle.stockNumber,
      vehicle: vehicle.vehicle,
      photos: vehicle.photos,
      price: vehicle.price,
      daysInStock: vehicle.daysInStock,
      status: vehicle.status,
      statusLabel: vehicle.statusLabel,
      action: "Open",
    })),
    pagination: data.pagination,
  };
}

async function getVehicle(dealershipId, id) {
  const vehicle = await assertVehicle(id, dealershipId);
  return {
    title: "Vehicle Merchandising",
    vehicle,
  };
}

function collectImageUrls(body = {}, files = []) {
  const urls = [];
  let raw = body.images !== undefined ? body.images : body.image;
  if (typeof raw === "string" && raw.trim().startsWith("[")) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [raw];
    }
  }
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  for (const item of list) {
    const value = String(item || "").trim();
    if (!value) continue;
    if (!/^https?:\/\//i.test(value)) {
      throw new AppError("Image links must start with http:// or https://", 400);
    }
    urls.push(value);
  }
  for (const file of files || []) {
    if (file?.filename) urls.push(`/uploads/vehicles/${file.filename}`);
  }
  if (urls.length > 10) {
    throw new AppError("You can add up to 10 images", 400);
  }
  return urls;
}

async function createVehicle(dealershipId, body = {}, files = []) {
  await requireDealership(dealershipId);
  const vehicleName = String(body.vehicle || "").trim();
  const make = String(body.make || "").trim();
  const model = String(body.model || "").trim();
  if (!vehicleName && !make && !model) {
    throw new AppError("vehicle or make/model is required", 400);
  }
  const imageUrls = collectImageUrls(body, files);
  const status = parseStatus(body.status, imageUrls.length ? "PROCESSED" : "NEEDS_PHOTOS");
  const created = await MerchandisingVehicle.create({
    dealershipId,
    stockNumber: body.stockNumber,
    vin: body.vin,
    year: body.year,
    make,
    model,
    vehicle: vehicleName,
    price: body.price,
    photos: imageUrls.length || body.photos,
    status,
    daysInStock: body.daysInStock,
    arrivedAt: body.arrivedAt,
  });
  if (imageUrls.length) await MerchandisingVehicle.addImages(created.id, imageUrls);
  const vehicle = await MerchandisingVehicle.findById(created.id, dealershipId);
  return { message: "Vehicle created", vehicle };
}

function removeStoredImage(url) {
  if (!url || !String(url).startsWith("/uploads/vehicles/")) return;
  const filePath = path.join(__dirname, "../../uploads/vehicles", path.basename(url));
  fs.unlink(filePath, () => {});
}

async function deleteVehicleImage(dealershipId, vehicleId, imageId) {
  await assertVehicle(vehicleId, dealershipId);
  const removed = await MerchandisingVehicle.deleteImage(vehicleId, imageId);
  if (!removed) throw new AppError("Image not found", 404);
  removeStoredImage(removed.url);
  const vehicle = await MerchandisingVehicle.findById(vehicleId, dealershipId);
  return { message: "Image deleted", vehicle };
}

async function deleteVehicle(dealershipId, id) {
  await assertVehicle(id, dealershipId);
  const urls = await MerchandisingVehicle.listImageUrls(id);
  const deleted = await MerchandisingVehicle.deleteById(id, dealershipId);
  if (!deleted) throw new AppError("Vehicle not found", 404);
  urls.forEach(removeStoredImage);
  return { message: "Vehicle deleted", id };
}

async function updateVehicle(dealershipId, id, body = {}, files = []) {
  await assertVehicle(id, dealershipId);
  const imageUrls = collectImageUrls(body, files);
  if (body.status) body.status = parseStatus(body.status);
  await MerchandisingVehicle.update(id, body);
  if (imageUrls.length) await MerchandisingVehicle.addImages(id, imageUrls);
  const vehicle = await MerchandisingVehicle.findById(id, dealershipId);
  return { message: "Vehicle updated", vehicle };
}

module.exports = {
  getDashboard,
  listInventory,
  listNeedsPhotos,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicleImage,
  deleteVehicle,
};
