const express = require("express");
const router = express.Router();
const dbConnector = require("../middleware/dbConnector");
const { authorizeRole } = require("../middleware/roleCheck");
const noticeController = require("../controllers/noticeController");

// Admin creates notice (meeting, maintenance, general/event)
router.post(
  "/create",
  dbConnector,
  authorizeRole(["admin"]),
  noticeController.createNotice
);

// Admin gets ALL notices (global view)
router.get(
  "/admin/all",
  dbConnector,
  authorizeRole(["admin"]),
  noticeController.getAllNotices
);

// User gets ONLY their notices
router.get(
  "/my",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  noticeController.getMyNotices
);

router.get(
  "/admin/registry",
  dbConnector,
  authorizeRole(["admin"]),
  noticeController.getRegistry
);

router.delete(
  "/:id",
  dbConnector,
  authorizeRole(["admin"]),
  noticeController.deleteNotice
);

router.put(
  "/:id",
  dbConnector,
  authorizeRole(["admin"]),
  noticeController.updateNotice
);

module.exports = router;
