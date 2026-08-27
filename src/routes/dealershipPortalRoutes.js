const express = require("express");
const ctrl = require("../controllers/dealershipPortalController");
const {
  authMiddleware,
  requireDealershipPortal,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireDealershipPortal);

router.get("/leads", ctrl.listLeads);
router.get("/leads/:id", ctrl.getLead);
router.patch("/leads/:id/status", ctrl.setLeadStatus);
router.patch("/leads/:id/assign", ctrl.assignLead);

router.get("/conversations", ctrl.listConversations);
router.get("/conversations/:leadId", ctrl.getConversation);
router.post("/conversations/:leadId/messages", ctrl.sendMessage);

router.get("/salespeople", ctrl.listSalespeople);

router.get("/social-accounts", ctrl.listSocialAccounts);
router.put("/social-accounts/:id", ctrl.updateSocialAccount);
router.post("/social-accounts/:id/disconnect", ctrl.disconnectSocialAccount);

router.get("/crm", ctrl.getCrm);
router.post("/crm/sync", ctrl.syncCrm);

router.get("/ai-content", ctrl.listAiContent);
router.get("/ai-content/:id", ctrl.getAiContent);

router.get("/reports/summary", ctrl.getReports);

router.get("/settings", ctrl.getSettings);
router.put("/settings", ctrl.saveSettings);

module.exports = router;
