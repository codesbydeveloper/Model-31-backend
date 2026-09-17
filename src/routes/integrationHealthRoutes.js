const express = require("express");
const ctrl = require("../controllers/integrationHealthController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", ctrl.overview);
router.post("/run-check", ctrl.runHealthCheck);

module.exports = router;
