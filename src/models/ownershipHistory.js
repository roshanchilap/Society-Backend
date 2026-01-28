const mongoose = require("mongoose");
const User = require("../models/User");

const OwnershipHistorySchema = new mongoose.Schema({
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat", required: true },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // null if current
  transferReason: { type: String },
});

module.exports = OwnershipHistorySchema;
