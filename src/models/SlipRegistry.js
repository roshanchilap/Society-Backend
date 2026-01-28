const mongoose = require("mongoose");

const SlipRegistrySchema = new mongoose.Schema({
  societyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Society",
    required: true,
  },
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat", required: true },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  maintenanceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Maintenance",
    required: true,
  },

  slipNumber: { type: String, required: true, unique: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  amount: { type: Number, required: true },
  amountWords: { type: String, required: true },

  pdfPath: { type: String }, // or store as Buffer if you want inline
  createdAt: { type: Date, default: Date.now },
});

SlipRegistrySchema.index(
  { societyId: 1, year: 1, slipNumber: 1 },
  { unique: true }
);

module.exports = SlipRegistrySchema;
