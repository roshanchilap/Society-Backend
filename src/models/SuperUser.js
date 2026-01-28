const mongoose = require("mongoose");
const { masterConn } = require("../db/masterDb");

const SuperUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "super"], default: "super" },
  },
  { timestamps: true },
);

// Always bind SuperUser to masterConn
module.exports =
  masterConn.models.SuperUser ||
  masterConn.model("SuperUser", SuperUserSchema, "superusers");
