const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const User = require("../models/User");
const Dealership = require("../models/Dealership");
const AppError = require("../utils/AppError");
const { ROLES, STATUSES } = require("../utils/constants");
const { toPublicUser } = require("./authService");

function formatUser(user) {
  const publicUser = toPublicUser(user);
  return {
    ...publicUser,
    dealershipId: user.dealershipId || null,
    dealership:
      user.dealershipName ||
      (user.role === "Super Admin" ? "Model 31 Corporate" : "Unassigned"),
    lastActive: user.lastActive || null,
    createdAt: user.createdAt || null,
  };
}

async function resolveDealershipId(dealershipId, dealership) {
  if (dealershipId === null || dealershipId === "" || dealershipId === "unassigned") {
    return null;
  }
  if (dealershipId) {
    const store = await Dealership.findById(dealershipId);
    if (!store) throw new AppError("Dealership not found", 404);
    return store.id;
  }
  if (dealership === null || dealership === "" || dealership === "Unassigned") {
    return null;
  }
  if (dealership) {
    const store = await Dealership.findByName(String(dealership).trim());
    if (!store) throw new AppError("Dealership not found", 404);
    return store.id;
  }
  return undefined;
}

function validateUserPayload(body, { requirePassword = false } = {}) {
  if (!body.name || String(body.name).trim() === "") {
    throw new AppError("Name is required", 400);
  }
  if (!body.email || String(body.email).trim() === "") {
    throw new AppError("Email is required", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email).trim())) {
    throw new AppError("A valid email is required", 400);
  }
  if (!body.role || !ROLES.includes(body.role)) {
    throw new AppError(`role must be one of: ${ROLES.join(", ")}`, 400);
  }
  if (body.status && !STATUSES.includes(body.status)) {
    throw new AppError("status must be Active, Inactive, or Suspended", 400);
  }
  if (requirePassword) {
    if (!body.password || String(body.password).trim() === "") {
      throw new AppError("Password is required", 400);
    }
    if (String(body.password).length < 8) {
      throw new AppError("Password must be at least 8 characters", 400);
    }
  } else if (body.password && String(body.password).length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }
}

async function listUsers(query) {
  const result = await User.list({
    search: query.search || "",
    role: query.role || "",
    status: query.status || "",
    page: query.page,
    limit: query.limit,
  });
  return {
    users: result.users.map(formatUser),
    pagination: result.pagination,
  };
}

async function getUser(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return formatUser(user);
}

async function createUser(body) {
  validateUserPayload(body, { requirePassword: true });

  const normalizedEmail = String(body.email).trim().toLowerCase();
  const existing = await User.findByEmail(normalizedEmail);
  if (existing) {
    throw new AppError("Email already registered", 409);
  }

  let dealershipId = await resolveDealershipId(body.dealershipId, body.dealership);
  if (dealershipId === undefined) {
    dealershipId = null;
  }
  if (body.role === "Super Admin") {
    dealershipId = null;
  }

  const salespersonId =
    body.role === "Salesperson"
      ? body.salespersonId || `sp_${randomUUID().slice(0, 6)}`
      : null;

  const hashedPassword = await bcrypt.hash(String(body.password), 10);

  const user = await User.create({
    name: String(body.name).trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: body.role,
    dealershipId,
    phone: body.phone || null,
    status: body.status || "Active",
    salespersonId,
  });

  return formatUser(user);
}

async function updateUser(id, body) {
  const current = await User.findById(id);
  if (!current) throw new AppError("User not found", 404);

  validateUserPayload({
    name: body.name !== undefined ? body.name : current.name,
    email: body.email !== undefined ? body.email : current.email,
    role: body.role !== undefined ? body.role : current.role,
    status: body.status !== undefined ? body.status : current.status,
    password: body.password,
  });

  const normalizedEmail =
    body.email !== undefined
      ? String(body.email).trim().toLowerCase()
      : current.email;

  if (normalizedEmail !== current.email) {
    const existing = await User.findByEmail(normalizedEmail);
    if (existing && existing.id !== id) {
      throw new AppError("Email already registered", 409);
    }
  }

  const role = body.role !== undefined ? body.role : current.role;
  let dealershipId = current.dealershipId;

  if (body.dealershipId !== undefined || body.dealership !== undefined) {
    const resolved = await resolveDealershipId(body.dealershipId, body.dealership);
    dealershipId = resolved === undefined ? null : resolved;
  }
  if (role === "Super Admin") {
    dealershipId = null;
  }

  const salespersonId =
    role === "Salesperson"
      ? body.salespersonId !== undefined
        ? body.salespersonId
        : current.salespersonId || `sp_${randomUUID().slice(0, 6)}`
      : null;

  if (body.password) {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    await User.updatePassword(id, hashedPassword);
  }

  const user = await User.update(id, {
    name: body.name !== undefined ? String(body.name).trim() : current.name,
    email: normalizedEmail,
    role,
    dealershipId,
    phone: body.phone !== undefined ? body.phone : current.phone,
    status: body.status !== undefined ? body.status : current.status,
    salespersonId,
  });

  return formatUser(user);
}

async function deleteUser(id, currentUserId) {
  const user = await User.findById(id);
  if (!user) throw new AppError("User not found", 404);
  if (currentUserId && currentUserId === id) {
    throw new AppError("You cannot delete your own account", 400);
  }
  await User.remove(id);
  return { id };
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  formatUser,
};
