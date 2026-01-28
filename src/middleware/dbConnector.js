const { MasterSociety } = require("../db/masterDb");
const { getTenantConnection } = require("../db/tenantDb");

async function dbConnector(req, res, next) {
  try {
    const { societyId } = req.user;
    if (!societyId) {
      return res.status(400).json({ message: "Missing societyId in token" });
    }

    const society = await MasterSociety.findById(societyId).lean();
    if (!society || !society.dbUri) {
      return res.status(404).json({ message: "Society not found" });
    }

    const { conn, models } = await getTenantConnection(society);

    req.db = conn;
    req.models = models;

    next();
  } catch (err) {
    console.error("dbConnector error:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
}

module.exports = dbConnector;
