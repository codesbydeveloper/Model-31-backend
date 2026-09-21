const express = require("express");
const ctrl = require("../controllers/serviceManagerController");
const {
  authMiddleware,
  requireServiceManager,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireServiceManager);

router.get("/dashboard", ctrl.dashboard);

router.get("/jobs", ctrl.listJobs);
router.post("/jobs", ctrl.createJob);
router.get("/jobs/:id", ctrl.getJob);
router.patch("/jobs/:id", ctrl.updateJob);

router.get("/advisors", ctrl.listAdvisors);
router.get("/delayed", ctrl.listDelayedJobs);

module.exports = router;
