const mongoose = require("mongoose");

const SocietySchema = new mongoose.Schema({
  name: String,
  code: String,
  dbUri: String,
  createdAt: { type: Date, default: Date.now },
});

// master connection (points to global registry DB)
const masterConn = mongoose.createConnection(process.env.MASTER_DB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
});

masterConn.on("connected", () =>
  console.log("Master DB connected: ", masterConn.name),
);
masterConn.on("error", (err) => console.error("Master DB error:", err));

const MasterSociety = masterConn.model("Society", SocietySchema, "societies");

module.exports = { MasterSociety, masterConn };
