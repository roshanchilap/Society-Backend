const express = require("express");
const cors = require("cors");

const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin"); // super user routes
const societyRoutes = require("./src/routes/index"); // society user routes

const { authenticateJWT } = require("./src/middleware/auth");
const dbConnector = require("./src/middleware/dbConnector");
const { loadUserContext } = require("./src/middleware/loadUserContext");

const app = express();
app.use(cors());
app.use(express.json());

// 🔓 Public routes
app.use("/api/auth", authRoutes);

// 🔐 Super user protected routes (NO dbConnector)
app.use("/api/admin", authenticateJWT, adminRoutes);

// 🔐 Society protected routes (WITH dbConnector)
app.use("/api", authenticateJWT, dbConnector, loadUserContext, societyRoutes);

module.exports = app;
