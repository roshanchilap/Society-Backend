const mongoose = require("mongoose");

const TenantHistorySchema = new mongoose.Schema({
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat", required: true },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // null if current
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // owner/admin
});

module.exports = TenantHistorySchema;
