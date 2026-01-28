const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const adminRoutes = require("./admin");
const flatRoutes = require("./flats");
const userRoutes = require("./users");

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/flats", flatRoutes);
router.use("/users", userRoutes);
router.use("/maintenance", require("./maintenance"));
router.use("/notices", require("./notice"));
router.use("/ownership", require("./ownership"));
router.use("/tenant", require("./tenant"));
router.use("/complaints", require("./complaint"));
router.use("/notifications", require("./notification"));

module.exports = router;
