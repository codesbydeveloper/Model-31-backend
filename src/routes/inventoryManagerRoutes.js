const express = require("express");
const ctrl = require("../controllers/inventoryManagerController");
const { vehicleImageUpload } = require("../middleware/vehicleImageUpload");
const { csvUpload } = require("../middleware/csvUpload");
const {
  authMiddleware,
  requireInventoryManager,
  requireDealershipInventoryRead,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/inventory", authMiddleware, requireDealershipInventoryRead, ctrl.listInventory);
router.post(
  "/inventory/upload",
  authMiddleware,
  requireDealershipInventoryRead,
  csvUpload,
  ctrl.uploadInventoryCsv
);

router.use(authMiddleware, requireInventoryManager);

router.get("/dashboard", ctrl.dashboard);

router.post("/inventory", vehicleImageUpload, ctrl.createVehicle);
router.get("/inventory/:id", ctrl.getVehicle);
router.patch("/inventory/:id", vehicleImageUpload, ctrl.updateVehicle);
router.delete("/inventory/:id/images/:imageId", ctrl.deleteVehicleImage);
router.delete("/inventory/:id", ctrl.deleteVehicle);

router.get("/photos", ctrl.listNeedsPhotos);

module.exports = router;
