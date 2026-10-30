const express = require("express");
const ctrl = require("../controllers/roleNotificationController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", ctrl.list);
router.get("/unread-count", ctrl.unreadCount);
router.get("/catalog", ctrl.catalog);
router.post("/read-all", ctrl.markAllRead);
router.patch("/:id/read", ctrl.markRead);
router.post("/", requireSuperAdmin, ctrl.create);

module.exports = router;
