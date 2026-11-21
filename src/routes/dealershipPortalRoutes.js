const express = require("express");
const ctrl = require("../controllers/dealershipPortalController");
const { csvUpload } = require("../middleware/csvUpload");
const {
  authMiddleware,
  requireDealershipPortal,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireDealershipPortal);

router.get("/dashboard", ctrl.dashboard);

router.get("/leads", ctrl.listLeads);
router.post("/leads/upload", csvUpload, ctrl.uploadCrmLeads);
router.post("/leads/:id/mark-sold", ctrl.markLeadSold);
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
router.get("/crm/leads/sample", ctrl.downloadSampleLeadsCsv);
router.get("/crm/inventory/sample", ctrl.downloadSampleInventoryCsv);
router.get("/crm/sold/sample", ctrl.downloadSampleSoldCsv);
router.post("/crm/leads/upload", csvUpload, ctrl.uploadCrmLeads);
router.post("/crm/inventory/upload", csvUpload, ctrl.uploadCrmInventory);
router.post("/crm/sold/upload", csvUpload, ctrl.uploadCrmSold);
router.get("/crm/sold", ctrl.listCrmSoldCharges);
router.post("/crm/leads/:id/mark-sold", ctrl.markLeadSold);
router.post("/crm/sync", ctrl.syncCrm);

router.get("/ai-content", ctrl.listAiContent);
router.get("/ai-content/:id", ctrl.getAiContent);

router.get("/reports/summary", ctrl.getReports);

router.get("/settings", ctrl.getSettings);
router.put("/settings", ctrl.saveSettings);

router.get("/sms-account", ctrl.getSmsAccount);
router.put("/sms-account", ctrl.saveSmsAccount);
router.post("/sms-account/connect", ctrl.connectSmsAccount);
router.post("/sms-account/disconnect", ctrl.disconnectSmsAccount);
router.delete("/sms-account", ctrl.deleteSmsAccount);

module.exports = router;
