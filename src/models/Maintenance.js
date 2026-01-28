const mongoose = require("mongoose");

const MaintenanceSchema = new mongoose.Schema(
  {
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flat",
      required: true,
    },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    cycleYear: { type: Number, required: true },
    cycleMonth: { type: Number, required: true },
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    notes: { type: String },
    slipNumber: { type: String, unique: true, sparse: true },
    receiptGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound unique index
MaintenanceSchema.index(
  { flatId: 1, cycleYear: 1, cycleMonth: 1 },
  { unique: true }
);

module.exports = MaintenanceSchema;
