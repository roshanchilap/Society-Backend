const mongoose = require("mongoose");

const addressSubSchema = new mongoose.Schema(
  {
    tower: { type: String, trim: true },
    floor: { type: String, trim: true },
    block: { type: String, trim: true },
  },
  { _id: false }
);

const FlatSchema = new mongoose.Schema(
  {
    flatNumber: { type: String, required: true, trim: true }, // e.g., A-101
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    areaSqFt: { type: Number, min: 0 },
    address: addressSubSchema,
    status: { type: String, enum: ["occupied", "vacant"], default: "vacant" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Indexes
FlatSchema.index({ flatNumber: 1 }, { unique: true });

module.exports = FlatSchema;
