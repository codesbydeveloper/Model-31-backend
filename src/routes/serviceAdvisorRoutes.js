const express = require("express");
const ctrl = require("../controllers/serviceAdvisorController");
const {
  authMiddleware,
  requireServiceAdvisor,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireServiceAdvisor);

router.get("/dashboard", ctrl.dashboard);

router.get("/appointments", ctrl.listAppointments);

router.get("/jobs", ctrl.listJobs);
router.get("/jobs/:id", ctrl.getJob);
router.patch("/jobs/:id", ctrl.updateJob);

module.exports = router;
