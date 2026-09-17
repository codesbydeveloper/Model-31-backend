const express = require("express");
const ctrl = require("../controllers/systemControlsController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.overview);
router.patch("/", ctrl.update);
router.patch("/nuclear-mode", ctrl.patchNuclearMode);
router.patch("/toggles/:key", ctrl.patchToggle);

module.exports = router;
