const express = require("express");
const ctrl = require("../controllers/analyticsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.overview);

module.exports = router;
