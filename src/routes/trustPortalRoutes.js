const express = require("express");
const ctrl = require("../controllers/trustPortalController");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  requireTrustReader,
  requireSuperAdminOrModel31,
} = require("../middleware/requireModel31Access");

const router = express.Router();

router.use(authMiddleware);

router.post("/sold-log", requireTrustReader, ctrl.ingestSoldLog);
router.post("/attribution/run", requireSuperAdminOrModel31, ctrl.runAttribution);
router.get("/invoices", requireTrustReader, ctrl.listInvoices);
router.get("/invoices/:id", requireTrustReader, ctrl.getInvoice);
router.get("/line-items/:id", requireTrustReader, ctrl.getLineItem);

module.exports = router;
