const mongoose = require("mongoose");

const NoticeRegistrySchema = new mongoose.Schema(
  {
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: String,
    message: String,
    type: String,

    sentToCount: Number, // how many users received
    recipients: [mongoose.Schema.Types.ObjectId], // optional
  },
  { timestamps: true }
);

module.exports = NoticeRegistrySchema;
