const express = require("express");
const ctrl = require("../controllers/salespersonPortalController");
const { authMiddleware, requireSalesperson } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSalesperson);

router.get("/dashboard", ctrl.dashboard);
router.patch("/presence", ctrl.setPresence);

router.get("/incoming-leads", ctrl.listIncoming);
router.patch("/incoming-leads/:id/accept", ctrl.acceptLead);
router.patch("/incoming-leads/:id/decline", ctrl.declineLead);

router.get("/leads", ctrl.listMyLeads);
router.get("/leads/:id", ctrl.getLead);
router.patch("/leads/:id/status", ctrl.setLeadStatus);
router.post("/leads/:id/notes", ctrl.addNote);
router.patch("/leads/:id/sold", ctrl.markSold);
router.patch("/leads/:id/not-sold", ctrl.markNotSold);

router.get("/conversations", ctrl.listConversations);
router.get("/conversations/:leadId", ctrl.getConversation);
router.post("/conversations/:leadId/messages", ctrl.sendMessage);

router.get("/appointments", ctrl.listAppointments);
router.post("/appointments", ctrl.createAppointment);
router.get("/appointments/:id", ctrl.getAppointment);

router.get("/sold-deals", ctrl.listSoldDeals);
router.get("/sold-deals/:id", ctrl.getSoldDeal);

router.get("/commission", ctrl.getCommission);

module.exports = router;
