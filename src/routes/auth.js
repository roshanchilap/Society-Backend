const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateJWT } = require("../middleware/auth");

router.post("/super/login", authController.superLogin);
router.post("/login", authController.societyLogin);
router.get("/me", authenticateJWT, authController.me);

module.exports = router;
