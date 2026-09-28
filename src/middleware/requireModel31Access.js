const { MODEL31_ALLOWED_EMAILS } = require("../config/model31Access");
const { DEALERSHIP_PORTAL_ROLES } = require("../utils/constants");
const { error } = require("../utils/response");

function requireModel31Access(req, res, next) {
  const userEmail = req.user?.email?.toLowerCase();
  if (!userEmail || !MODEL31_ALLOWED_EMAILS.has(userEmail)) {
    return res.status(403).json({
      success: false,
      message: "Access to Model 31 is blocked",
      error: "Access to Model 31 is blocked",
    });
  }
  next();
}

function requireSuperAdminOrModel31(req, res, next) {
  if (req.user?.role === "Super Admin") return next();
  return requireModel31Access(req, res, next);
}

function requireTrustReader(req, res, next) {
  if (!req.user) return error(res, "Authentication required", 401);
  if (req.user.role === "Super Admin") {
    req.trustAll = true;
    return next();
  }
  const email = req.user.email?.toLowerCase();
  if (email && MODEL31_ALLOWED_EMAILS.has(email)) {
    req.trustAll = true;
    return next();
  }
  if (DEALERSHIP_PORTAL_ROLES.includes(req.user.role) && req.user.dealershipId) {
    req.trustAll = false;
    req.dealershipId = req.user.dealershipId;
    return next();
  }
  return error(res, "Trust portal access required", 403);
}

function rejectModel31Writes(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({
      success: false,
      message: "Model 31 is sealed. Write routes are disabled.",
    });
  }
  next();
}

module.exports = {
  requireModel31Access,
  requireSuperAdminOrModel31,
  requireTrustReader,
  rejectModel31Writes,
};
