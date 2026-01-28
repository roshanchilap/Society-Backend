const express = require("express");
const router = express.Router();
const complaintController = require("../controllers/complaintController");
const { authorizeRole } = require("../middleware/roleCheck");
const dbConnector = require("../middleware/dbConnector");
const commentController = require("../controllers/complaintCommentController");

// ------------------------------------
// CREATE COMPLAINT
// Admin, Owner, Tenant
// ------------------------------------
router.post(
  "/create",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  complaintController.createComplaint,
);

// ------------------------------------
// GET ALL COMPLAINTS (role-aware logic inside controller)
// Admin, Owner, Tenant
// ------------------------------------
router.get(
  "/",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  complaintController.getComplaints,
);

// ------------------------------------
// GET SINGLE COMPLAINT
// Admin, Owner, Tenant (permission checked inside controller)
// ------------------------------------
router.get(
  "/:complaintId",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  complaintController.getComplaintById,
);

// ------------------------------------
// ASSIGN COMPLAINT (admins / users)
// Admin only
// ------------------------------------
router.put(
  "/:complaintId/assign",
  dbConnector,
  authorizeRole(["admin"]),
  complaintController.assignComplaint,
);

// ------------------------------------
// UPDATE COMPLAINT STATUS
// Admin only (assigned admin check inside controller)
// ------------------------------------
router.put(
  "/:complaintId/status",
  dbConnector,
  authorizeRole(["admin"]),
  complaintController.updateComplaintStatus,
);

// Update complaint
router.put(
  "/:id",
  dbConnector,
  authorizeRole(["admin", "owner"]),
  complaintController.updateComplaint,
);

// ------------------------------------
// DELETE COMPLAINT (optional but recommended)
// Admin only
// ------------------------------------
router.delete(
  "/:complaintId",
  dbConnector,
  authorizeRole(["admin"]),
  complaintController.deleteComplaint,
);

// GET comments
router.get(
  "/:complaintId/comments",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  commentController.getComments,
);

// ADD comment
router.post(
  "/:complaintId/comments",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  commentController.addComment,
);

module.exports = router;
