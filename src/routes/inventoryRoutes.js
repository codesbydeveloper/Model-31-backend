const express = require("express");
const ctrl = require("../controllers/inventoryController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* Image 1 — list + KPIs + filters */
router.get("/", ctrl.list);

/* Image 2 — View details */
router.get("/:vehicleId", ctrl.getOne);

module.exports = router;
