const express = require("express");
const ctrl = require("../controllers/inventoryManagerController");
const {
  authMiddleware,
  requireInventoryManager,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireInventoryManager);

router.get("/dashboard", ctrl.dashboard);

router.get("/inventory", ctrl.listInventory);
router.post("/inventory", ctrl.createVehicle);
router.get("/inventory/:id", ctrl.getVehicle);
router.patch("/inventory/:id", ctrl.updateVehicle);

router.get("/photos", ctrl.listNeedsPhotos);

module.exports = router;
