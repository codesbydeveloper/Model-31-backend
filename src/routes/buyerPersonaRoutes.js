const express = require("express");
const buyerPersonaController = require("../controllers/buyerPersonaController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", buyerPersonaController.list);
router.post("/", buyerPersonaController.create);
router.get("/:id", buyerPersonaController.getOne);
router.put("/:id", buyerPersonaController.update);
router.delete("/:id", buyerPersonaController.remove);

module.exports = router;
