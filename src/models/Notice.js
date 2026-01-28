const mongoose = require("mongoose");

const NoticeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: ["general", "event", "maintenance", "meeting"],
      default: "general",
    },

    // TTL index: Auto delete after 30 days
    expiresAt: {
      type: Date,
      default: () => Date.now(),
      expires: 60 * 60 * 24 * 30, // 30 days
    },
  },
  { timestamps: true }
);

module.exports = NoticeSchema;
