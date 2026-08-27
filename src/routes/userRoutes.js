const express = require("express");
const userController = require("../controllers/userController");
const { authMiddleware, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/", userController.list);
router.post("/", userController.create);
router.get("/:id", userController.getOne);
router.put("/:id", userController.update);
router.delete("/:id", userController.remove);

module.exports = router;
