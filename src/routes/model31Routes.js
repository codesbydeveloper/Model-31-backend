const express = require("express");
const ctrl = require("../controllers/model31Controller");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  requireModel31Access,
  rejectModel31Writes,
} = require("../middleware/requireModel31Access");

const router = express.Router();

router.use(authMiddleware, requireModel31Access, rejectModel31Writes);

router.get("/", ctrl.engine);
router.get("/workflow", ctrl.workflow);
router.get("/routing/logs", ctrl.routingLogs);
router.get("/routing/bands", ctrl.bands);
router.get("/routing", ctrl.routing);
router.get("/guards", ctrl.guards);

module.exports = router;
