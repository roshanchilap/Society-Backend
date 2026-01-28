const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/tenantController");
const dbConnector = require("../middleware/dbConnector");

// Change tenant
router.post(
  "/:flatId/tenant-history",
  dbConnector,
  tenantController.changeTenant
);

// Get tenant history
router.get(
  "/:flatId/tenant-history",
  dbConnector,
  tenantController.getTenantHistory
);

module.exports = router;
