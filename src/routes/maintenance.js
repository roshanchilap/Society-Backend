const express = require("express");
const router = express.Router();
const maintenanceController = require("../controllers/maintenanceController");
const { authorizeRole } = require("../middleware/roleCheck");
const reportController = require("../controllers/reportController");
const auditController = require("../controllers/auditLogController");
const dbConnector = require("../middleware/dbConnector");

// Admin only
router.post(
  "/create",
  dbConnector,
  authorizeRole(["admin"]),
  maintenanceController.createMaintenance
);

router.put(
  "/:maintenanceId",
  dbConnector,
  authorizeRole(["admin"]),
  maintenanceController.updateMaintenance
);

router.get(
  "/",
  dbConnector,
  authorizeRole(["admin"]),
  maintenanceController.getAllMaintenance
);

router.delete(
  "/:maintenanceId",
  dbConnector,
  authorizeRole(["admin"]),
  maintenanceController.deleteMaintenance
);

// Admin, Owner, Tenant can view maintenance for their flat
router.get(
  "/flat/:flatId",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  maintenanceController.getMaintenanceByFlat
);

router.get(
  "/reports/maintenance",
  dbConnector,
  authorizeRole(["admin"]),
  reportController.getMonthlyMaintenanceReport
);

router.get(
  "/audit/logs",
  dbConnector,
  authorizeRole(["admin"]),
  auditController.getAuditLogs
);

router.get(
  "/my",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  maintenanceController.getMaintenanceRecords
);
router.get(
  "/export/csv",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  maintenanceController.exportMaintenanceCSV
);
router.get(
  "/export/pdf",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  maintenanceController.exportMaintenancePDF
);

router.get(
  "/:maintenanceId/slip",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  maintenanceController.generateMaintenanceSlip
);

router.get(
  "/getslipdata",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  maintenanceController.getSlips
);

module.exports = router;
