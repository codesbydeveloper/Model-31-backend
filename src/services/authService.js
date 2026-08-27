const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    dealership:
      user.dealershipName ||
      (user.role === "Super Admin" ? "Model 31 Corporate" : "Unassigned"),
    salespersonId: user.role === "Salesperson" ? user.salespersonId : null,
    phone: user.phone || null,
  };
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError("Invalid email or password", 401);
  }

  const user = await User.findByEmail(String(email).trim().toLowerCase());
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new AppError("Invalid email or password", 401);
  }

  if (user.status !== "Active") {
    throw new AppError("Account is not active", 401);
  }

  await User.touchLastActive(user.id);
  const refreshed = await User.findById(user.id);

  return {
    token: generateToken(refreshed),
    user: toPublicUser(refreshed),
  };
}

module.exports = { login, toPublicUser };
