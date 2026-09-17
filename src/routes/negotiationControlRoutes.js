const express = require("express");
const ctrl = require("../controllers/negotiationControlController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);
router.put("/:id", ctrl.update);

module.exports = router;
