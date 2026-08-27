const express = require("express");
const scoringRulesController = require("../controllers/scoringRulesController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", scoringRulesController.get);
router.put("/", scoringRulesController.save);

module.exports = router;
