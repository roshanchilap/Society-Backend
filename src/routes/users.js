const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authorizeRole } = require("../middleware/roleCheck");
const dbConnector = require("../middleware/dbConnector");

// Create & Assign
router.post(
  "/create",
  dbConnector,
  authorizeRole(["admin"]),
  userController.createUserForFlat
);

// Read
router.get(
  "/",
  dbConnector,
  authorizeRole(["admin"]),
  userController.getAllUsers
);
router.get(
  "/:userId",
  dbConnector,
  authorizeRole(["admin"]),
  userController.getUserById
);

// Update
router.put(
  "/:userId",
  dbConnector,
  authorizeRole(["admin"]),
  userController.updateUser
);

// Delete
router.delete(
  "/:userId",
  dbConnector,
  authorizeRole(["admin"]),
  userController.deleteUser
);

module.exports = router;
