// routes/flats.js
const express = require("express");
const router = express.Router();
const flatController = require("../controllers/flatController");
const { authorizeRole } = require("../middleware/roleCheck");
const dbConnector = require("../middleware/dbConnector");

// ✅ Create Flat (Admin only)
router.post(
  "/create",
  dbConnector,
  authorizeRole(["admin"]),
  flatController.createFlat
);

// ✅ Get All Flats (Admin only)
router.get(
  "/",
  dbConnector,
  authorizeRole(["admin"]),
  flatController.getAllFlats
);

// ✅ Get Flat by ID (Admin, Owner, Tenant)
router.get(
  "/:flatId",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  flatController.getFlatById
);

// ✅ Update Flat (Admin only)
router.put(
  "/:flatId",
  dbConnector,
  authorizeRole(["admin"]),
  flatController.updateFlat
);

// ✅ Delete Flat (Admin only)
router.delete(
  "/:flatId",
  dbConnector,
  authorizeRole(["admin"]),
  flatController.deleteFlat
);

module.exports = router;
