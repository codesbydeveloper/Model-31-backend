const express = require("express");
const ctrl = require("../controllers/oemReportingController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.overview);
router.get("/export", ctrl.exportReport);

module.exports = router;
