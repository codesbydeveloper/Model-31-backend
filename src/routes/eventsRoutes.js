const express = require("express");
const ctrl = require("../controllers/eventsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* Image 1 — Event Monitor list */
router.get("/", ctrl.list);

/* Image 3 — Quick view modal */
router.get("/:eventId/quick-view", ctrl.quickView);

/* Image 2 — Full detail page (Open / Full details) */
router.get("/:eventId", ctrl.fullDetail);

module.exports = router;
