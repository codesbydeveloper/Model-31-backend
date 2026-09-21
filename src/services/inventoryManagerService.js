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

async function createVehicle(dealershipId, body = {}) {
  await requireDealership(dealershipId);
  const vehicleName = String(body.vehicle || "").trim();
  const make = String(body.make || "").trim();
  const model = String(body.model || "").trim();
  if (!vehicleName && !make && !model) {
    throw new AppError("vehicle or make/model is required", 400);
  }
  const status = parseStatus(body.status, "NEEDS_PHOTOS");
  const vehicle = await MerchandisingVehicle.create({
    dealershipId,
    stockNumber: body.stockNumber,
    vin: body.vin,
    year: body.year,
    make,
    model,
    vehicle: vehicleName,
    price: body.price,
    photos: body.photos,
    status,
    daysInStock: body.daysInStock,
    arrivedAt: body.arrivedAt,
  });
  return { message: "Vehicle created", vehicle };
}

async function updateVehicle(dealershipId, id, body = {}) {
  await assertVehicle(id, dealershipId);
  if (body.status) body.status = parseStatus(body.status);
  const vehicle = await MerchandisingVehicle.update(id, body);
  return { message: "Vehicle updated", vehicle };
}

module.exports = {
  getDashboard,
  listInventory,
  listNeedsPhotos,
  getVehicle,
  createVehicle,
  updateVehicle,
};
