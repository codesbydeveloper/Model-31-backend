const express = require("express");
const negotiationTemplateController = require("../controllers/negotiationTemplateController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", negotiationTemplateController.list);
router.post("/", negotiationTemplateController.create);
router.get("/:id", negotiationTemplateController.getOne);
router.put("/:id", negotiationTemplateController.update);
router.post("/:id/duplicate", negotiationTemplateController.duplicate);
router.patch("/:id/status", negotiationTemplateController.setStatus);
router.delete("/:id", negotiationTemplateController.remove);

module.exports = router;
