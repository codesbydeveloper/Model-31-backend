const express = require("express");
const ctrl = require("../controllers/pipelineTransparencyController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.overview);
router.post("/classify", ctrl.classify);
router.get("/:leadId", ctrl.getOne);
router.patch("/:leadId", ctrl.updateOne);

module.exports = router;
