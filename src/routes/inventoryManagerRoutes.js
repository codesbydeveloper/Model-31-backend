const express = require("express");
const ctrl = require("../controllers/inventoryManagerController");
const { vehicleImageUpload } = require("../middleware/vehicleImageUpload");
const {
  authMiddleware,
  requireInventoryManager,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireInventoryManager);

router.get("/dashboard", ctrl.dashboard);

router.get("/inventory", ctrl.listInventory);
router.post("/inventory", vehicleImageUpload, ctrl.createVehicle);
router.get("/inventory/:id", ctrl.getVehicle);
router.patch("/inventory/:id", vehicleImageUpload, ctrl.updateVehicle);
router.delete("/inventory/:id/images/:imageId", ctrl.deleteVehicleImage);
router.delete("/inventory/:id", ctrl.deleteVehicle);

router.get("/photos", ctrl.listNeedsPhotos);

module.exports = router;
