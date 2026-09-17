const express = require("express");
const ctrl = require("../controllers/superAdminDashboardController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* KPI + Nuclear Mode */
router.get("/kpis", ctrl.kpis);
router.get("/nuclear-mode", ctrl.getNuclearMode);
router.patch("/nuclear-mode", ctrl.patchNuclearMode);

/* Top widgets */
router.get("/buyer-genome", ctrl.buyerGenome);
router.get("/deals-ready", ctrl.dealsReady);
router.get("/manager-handoffs", ctrl.managerHandoffs);
router.get("/negotiation-controls", ctrl.negotiationControls);
router.get("/buy-online-readiness", ctrl.buyOnlineReadiness);

/* Unified Lead Grid + Fingerprint (Open Fingerprint on grid) */
router.get("/leads", ctrl.listLeads);
router.get("/leads/:leadId", ctrl.getLead);
router.get("/fingerprint/:leadId", ctrl.fingerprint);

/* Map + Inbox + Performance */
router.get("/dispatch-map", ctrl.dispatchMap);
router.get("/smart-inbox", ctrl.smartInbox);
router.get("/rooftop-performance", ctrl.rooftopPerformance);
router.get("/activity-feed", ctrl.activityFeed);
router.get("/social-engine", ctrl.socialEngine);
router.get("/lead-workflow", ctrl.leadWorkflow);

/* CRM + OEM */
router.get("/crm-sync", ctrl.crmSync);
router.get("/oem-reporting", ctrl.oemReporting);
router.get("/oem-reporting/export", ctrl.oemExport);

/* Underwater Rescue + Fingerprint from rescue table */
router.get("/underwater-rescue", ctrl.underwaterRescue);
router.get("/underwater-rescue/activity", ctrl.rescueActivity);
router.get(
  "/underwater-rescue/activity/:activityId/fingerprint",
  ctrl.rescueFingerprint
);

module.exports = router;
