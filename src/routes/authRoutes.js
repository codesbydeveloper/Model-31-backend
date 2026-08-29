const express = require("express");
const { login, logout } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/logout", authMiddleware, logout);

module.exports = router;
