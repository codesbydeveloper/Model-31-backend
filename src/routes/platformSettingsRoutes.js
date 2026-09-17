const express = require("express");
const ctrl = require("../controllers/platformSettingsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.getSettings);
router.put("/", ctrl.saveSettings);

module.exports = router;
