const mongoose = require("mongoose");
const { masterConn } = require("../db/masterDb");

const SocietySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  dbUri: { type: String, required: true }, // tenant DB URI
  address: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  masterConn.models.Society ||
  masterConn.model("Society", SocietySchema, "societies");
