const express = require("express");
const router = express.Router();
const dbConnector = require("../middleware/dbConnector");
const { authorizeRole } = require("../middleware/roleCheck");
const controller = require("../controllers/notificationController");

/* ----------------------------------
   User notifications
---------------------------------- */

// get my notifications
router.get(
  "/my",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  controller.getMyNotifications,
);

// unread count (for header bell)
router.get(
  "/my/unread-count",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  controller.getUnreadCount,
);

// mark one as read
router.put(
  "/:id/read",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  controller.markAsRead,
);

// mark all as read
router.put(
  "/my/read-all",
  dbConnector,
  authorizeRole(["admin", "owner", "tenant"]),
  controller.markAllAsRead,
);

module.exports = router;
