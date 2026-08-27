const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { error } = require("../utils/response");

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return error(res, "Authentication required", 401);
    }

    const token = header.slice(7).trim();
    if (!token) {
      return error(res, "Authentication required", 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return error(res, "Invalid or expired token", 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return error(res, "Invalid or expired token", 401);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "Super Admin") {
    return error(res, "Super Admin access required", 403);
  }
  next();
}

function requireDealershipPortal(req, res, next) {
  const { DEALERSHIP_PORTAL_ROLES } = require("../utils/constants");
  if (!req.user || !DEALERSHIP_PORTAL_ROLES.includes(req.user.role)) {
    return error(res, "Dealership access required", 403);
  }
  if (!req.user.dealershipId) {
    return error(res, "No dealership assigned to this account", 403);
  }
  req.dealershipId = req.user.dealershipId;
  next();
}

function requireBdcManager(req, res, next) {
  if (!req.user || req.user.role !== "BDC Manager") {
    return error(res, "BDC Manager access required", 403);
  }
  next();
}

function requireSalesperson(req, res, next) {
  if (!req.user || req.user.role !== "Salesperson") {
    return error(res, "Salesperson access required", 403);
  }
  next();
}

function requireMarketingManager(req, res, next) {
  if (!req.user || req.user.role !== "Marketing Manager") {
    return error(res, "Marketing Manager access required", 403);
  }
  next();
}

module.exports = {
  authMiddleware,
  requireSuperAdmin,
  requireDealershipPortal,
  requireBdcManager,
  requireSalesperson,
  requireMarketingManager,
};
