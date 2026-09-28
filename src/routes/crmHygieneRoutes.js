const express = require("express");
const ctrl = require("../controllers/crmHygieneController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireSuperAdminOrModel31 } = require("../middleware/requireModel31Access");

const router = express.Router();

router.post("/webhook", ctrl.webhook);

router.get("/hygiene/stats", authMiddleware, requireSuperAdminOrModel31, ctrl.stats);
router.get("/hygiene/quarantine", authMiddleware, requireSuperAdminOrModel31, ctrl.quarantine);
router.get("/hygiene/leads", authMiddleware, requireSuperAdminOrModel31, ctrl.cleanLeads);
router.get("/melt-plate", authMiddleware, requireSuperAdminOrModel31, ctrl.meltPlate);

module.exports = router;
