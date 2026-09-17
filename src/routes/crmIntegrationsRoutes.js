const express = require("express");
const ctrl = require("../controllers/crmIntegrationsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* Image 1 — list page */
router.get("/", ctrl.overview);
router.get("/sync-errors", ctrl.syncErrors);
router.post("/sync-errors/:errorId/retry", ctrl.retryError);
router.get("/activity", ctrl.platformActivity);

/* Image 3–9 — connection details (View / Settings) */
router.get("/:crmId", ctrl.getOne);
router.get("/:crmId/settings", ctrl.getSettings);
router.put("/:crmId/settings", ctrl.updateSettings);
router.post("/:crmId/sync-now", ctrl.syncNow);
router.post("/:crmId/disconnect", ctrl.disconnect);
router.get("/:crmId/synchronization", ctrl.connectionSyncErrors);
router.get("/:crmId/field-mapping", ctrl.fieldMapping);
router.get("/:crmId/activity", ctrl.activity);
router.get("/:crmId/health", ctrl.health);

module.exports = router;
