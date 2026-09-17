const express = require("express");
const ctrl = require("../controllers/dealHandoffsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* Image 1 — list */
router.get("/", ctrl.list);

/* Image 5 — View Package modal */
router.get("/:id/visual-package", ctrl.visualPackage);

/* Action buttons (images 4, 6, 7, 8) */
router.post("/:id/accept-handoff", ctrl.acceptHandoff);
router.post("/:id/request-more-info", ctrl.requestMoreInfo);
router.post("/:id/take-over", ctrl.takeOver);
router.post("/:id/mark-closed", ctrl.markClosed);
router.get("/:id/open-lead", ctrl.openLead);

/* Images 2–4 — Review detail */
router.get("/:id", ctrl.getOne);

module.exports = router;
