const express = require("express");
const router = express.Router();
const ownershipController = require("../controllers/ownershipController");
const dbConnector = require("../middleware/dbConnector");

// Transfer ownership
router.post(
  "/:flatId/ownership-history",
  dbConnector,
  ownershipController.transferOwnership
);

// Get ownership history
router.get(
  "/:flatId/ownership-history",
  dbConnector,
  ownershipController.getOwnershipHistory
);

module.exports = router;
