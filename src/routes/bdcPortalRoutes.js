const express = require("express");
const ctrl = require("../controllers/bdcPortalController");
const { authMiddleware, requireBdcManager } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireBdcManager);

router.get("/leads", ctrl.listQualifiedLeads);
router.get("/leads/:id", ctrl.getLead);
router.patch("/leads/:id/assign", ctrl.assignLead);
router.patch("/leads/:id/reassign", ctrl.reassignLead);
router.patch("/leads/:id/escalate", ctrl.escalateLead);

router.get("/queue", ctrl.listQueue);

router.get("/salespeople", ctrl.listSalespeople);

router.get("/conversations", ctrl.listConversations);
router.get("/conversations/:leadId", ctrl.getConversation);
router.post("/conversations/:leadId/messages", ctrl.sendMessage);

router.get("/sla", ctrl.getSla);
router.get("/team", ctrl.getTeam);

router.get("/escalations", ctrl.listEscalations);
router.patch("/escalations/:id/resolve", ctrl.resolveEscalation);

module.exports = router;
