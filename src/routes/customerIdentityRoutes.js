const express = require("express");
const ctrl = require("../controllers/customerIdentityController");
const {
  authMiddleware,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

/* Image 1 — list */
router.get("/", ctrl.list);

/* Image 2 & 3 — View details */
router.get("/:customerId", ctrl.getOne);

/* Image 4 — Review Duplicate modal */
router.get("/:customerId/duplicate-review", ctrl.duplicateReview);
router.post("/:customerId/merge", ctrl.merge);

module.exports = router;
