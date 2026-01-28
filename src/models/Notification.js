const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "maintenance",
        "announcement",

        // complaints
        "complaint_created",
        "complaint_comment",
        "complaint_status",
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      trim: true,
    },

    meta: {
      complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaint",
      },
      maintenanceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Maintenance",
      },
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-clean old notifications (60 days)
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 60 },
);

module.exports = NotificationSchema;
