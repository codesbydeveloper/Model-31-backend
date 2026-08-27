const express = require("express");
const cityController = require("../controllers/cityController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", cityController.list);
router.post("/", cityController.create);
router.get("/:id", cityController.getOne);
router.put("/:id", cityController.update);
router.delete("/:id", cityController.remove);

module.exports = router;
