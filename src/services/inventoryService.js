const AppError = require("../utils/AppError");

const DEALERSHIPS = [
  "Miami Luxury Motors",
  "Chicago Auto Group",
  "Dallas Premium Motors",
  "Los Angeles Auto Center",
  "Houston Automotive Group",
  "Atlanta Drive Center",
];

const MAKES = ["Audi", "BMW", "Cadillac", "Lexus", "Mercedes", "Tesla", "Toyota"];

const STATUS_OPTIONS = ["All statuses", "AVAILABLE", "RESERVED", "SOLD", "PENDING"];
const PRICE_OPTIONS = [
  "All prices",
  "Under $50,000",
  "$50,000 – $70,000",
  "Over $70,000",
];

const vehicles = [];

const detailExtras = {};

function priceInRange(price, filter) {
  if (!filter || filter === "All prices") return true;
  if (filter === "Under $50,000") return price < 50000;
  if (filter === "$50,000 – $70,000") return price >= 50000 && price <= 70000;
  if (filter === "Over $70,000") return price > 70000;
  return true;
}

function getVehicleOrThrow(vehicleId) {
  const vehicle =
    vehicles.find((v) => v.id === vehicleId) ||
    vehicles.find((v) => v.vin === vehicleId);
  if (!vehicle) throw new AppError("Vehicle not found", 404);
  return vehicle;
}

function getOverview() {
  return {
    metrics: {
      totalVehicles: 0,
      available: 0,
      reserved: 0,
      sold: 0,
      lowInventory: 0,
      priceChanges: 0,
    },
    insights: [],
  };
}

function listVehicles(query = {}) {
  const search = String(query.search || "").trim().toLowerCase();
  const status = String(query.status || "").trim();
  const dealership = String(query.dealership || "").trim();
  const make = String(query.make || "").trim();
  const price = String(query.price || query.priceRange || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 8));

  let rows = [...vehicles];

  if (search) {
    rows = rows.filter(
      (v) =>
        v.vin.toLowerCase().includes(search) ||
        v.make.toLowerCase().includes(search) ||
        v.model.toLowerCase().includes(search) ||
        v.vehicle.toLowerCase().includes(search)
    );
  }
  if (status && status !== "All statuses") {
    rows = rows.filter((v) => v.status === status);
  }
  if (dealership && dealership !== "All dealerships") {
    rows = rows.filter((v) => v.dealership === dealership);
  }
  if (make && make !== "All makes") {
    rows = rows.filter((v) => v.make === make);
  }
  if (price) {
    rows = rows.filter((v) => priceInRange(v.price, price));
  }

  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;

  const items = rows.slice(start, start + limit).map((v) => ({
    id: v.id,
    vin: v.vin,
    vehicle: v.vehicle,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    price: v.price,
    status: v.status,
    dealership: v.dealership,
    daysInInventory: v.daysInInventory,
    lastUpdated: v.lastUpdated,
    actions: {
      view: `/api/super-admin/inventory/${v.id}`,
    },
  }));

  return {
    ...getOverview(),
    filters: {
      statuses: STATUS_OPTIONS,
      dealerships: ["All dealerships", ...DEALERSHIPS],
      makes: ["All makes", ...MAKES],
      prices: PRICE_OPTIONS,
    },
    vehicles: items,
    pagination: { page, limit, total, totalPages },
  };
}

function buildDefaultDetail(vehicle) {
  return {
    priceHistory: {
      summary: {
        original: vehicle.price,
        current: vehicle.price,
        changedOn: vehicle.lastUpdated,
      },
      items: [],
    },
    inventoryHistory: [],
  };
}

function getVehicleDetail(vehicleId) {
  const vehicle = getVehicleOrThrow(vehicleId);
  const extras = detailExtras[vehicle.id] || buildDefaultDetail(vehicle);

  return {
    vehicle: {
      id: vehicle.id,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      subtitle: `${vehicle.vin} · ${vehicle.dealership}`,
      status: vehicle.status,
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      price: vehicle.price,
      mileage: extras.mileage || vehicle.mileage,
      color: extras.color || vehicle.color,
      dealership: vehicle.dealership,
      availability: vehicle.status,
      daysInInventory: vehicle.daysInInventory,
      lastUpdated: vehicle.lastUpdated,
    },
    priceHistory: extras.priceHistory,
    inventoryHistory: extras.inventoryHistory,
  };
}

module.exports = {
  getOverview,
  listVehicles,
  getVehicleDetail,
};
