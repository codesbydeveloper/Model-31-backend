const express = require("express");
const ctrl = require("../controllers/publicScriptController");

const router = express.Router();

router.get("/:token", ctrl.getPublicScript);
router.post("/:token/approve", ctrl.approvePublicScript);

module.exports = router;
