const express = require("express");
const ctrl = require("../controllers/socialIntegrationsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.overview);
router.patch("/staff-accounts/:accountId", ctrl.updateStaffAccountSource);
router.get("/platforms/:platformSlug/settings", ctrl.getPlatformSettings);
router.post("/platforms/:platformSlug/connect", ctrl.connectPlatform);
router.post("/platforms/:platformSlug/disconnect", ctrl.disconnectPlatform);

module.exports = router;
