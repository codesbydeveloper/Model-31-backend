const express = require("express");
const ctrl = require("../controllers/inventoryController");
const { vehicleImageUpload } = require("../middleware/vehicleImageUpload");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* Image 1 — list + KPIs + filters */
router.get("/", ctrl.list);
router.post("/", vehicleImageUpload, ctrl.create);

/* Image 2 — View details */
router.get("/:vehicleId", ctrl.getOne);
router.patch("/:vehicleId", vehicleImageUpload, ctrl.update);
router.delete("/:vehicleId/images/:imageId", ctrl.removeImage);
router.delete("/:vehicleId", ctrl.remove);

module.exports = router;
