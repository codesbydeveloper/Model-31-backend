const express = require("express");
const leadController = require("../controllers/leadController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", leadController.list);
router.post("/", leadController.create);
router.get("/:id", leadController.getOne);
router.put("/:id", leadController.update);
router.patch("/:id/status", leadController.setStatus);
router.patch("/:id/assign", leadController.assign);

module.exports = router;
