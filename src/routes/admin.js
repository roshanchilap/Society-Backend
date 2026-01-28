// routes/admin.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { authorizeRole } = require("../middleware/roleCheck");
const { authenticateJWT } = require("../middleware/auth");

// Only super user can create admins
router.post(
  "/create-admin",
  authenticateJWT, // ✅ validate JWT
  authorizeRole(["super"]), // ✅ ensure role is super
  adminController.createAdmin, // ✅ controller handles societyId from req.body
);

module.exports = router;
