const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
    },
    collection: { type: String, required: true }, // e.g. "Maintenance", "Flat"
    recordId: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    details: { type: Object }, // optional snapshot of changes
  },
  { timestamps: true }
);

module.exports = AuditLogSchema;
