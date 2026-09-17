const express = require("express");
const aiConfigurationController = require("../controllers/aiConfigurationController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", aiConfigurationController.get);
router.put("/", aiConfigurationController.save);

module.exports = router;
