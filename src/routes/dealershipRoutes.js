const express = require("express");
const dealershipController = require("../controllers/dealershipController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", dealershipController.list);
router.get("/options", dealershipController.options);
router.post("/", dealershipController.create);
router.get("/:id", dealershipController.getOne);
router.put("/:id", dealershipController.update);
router.patch("/:id/status", dealershipController.setStatus);

module.exports = router;
