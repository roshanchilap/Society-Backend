const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    phoneno: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "owner", "tenant"], required: true },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat" },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Indexes
UserSchema.index({ role: 1 });
UserSchema.index({ flatId: 1 });

module.exports = UserSchema;
