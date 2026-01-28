// services/attachModels.js
const UserSchema = require("../models/User");
const FlatSchema = require("../models/Flat");
const MaintenanceSchema = require("../models/Maintenance");
const AuditLogSchema = require("../models/AuditLog");
const OwnershipHistorySchema = require("../models/OwnershipHistory");
const TenantHistorySchema = require("../models/TenantHistory");
const SlipCounterSchema = require("../models/SlipCounter");
const SlipRegistrySchema = require("../models/SlipRegistry");
const NoticeSchema = require("../models/Notice");
const NoticeRegistrySchema = require("../models/NoticeRegistry");
const ComplaintSchema = require("../models/Complaint");
const ComplaintCommentSchema = require("../models/ComplaintComment");
const NotificationSchema = require("../models/Notification");

function attachModels(connection) {
  return {
    User: connection.model("User", UserSchema, "users"),
    Flat: connection.model("Flat", FlatSchema, "flats"),
    Maintenance: connection.model(
      "Maintenance",
      MaintenanceSchema,
      "maintenances",
    ),
    Notice: connection.model("Notice", NoticeSchema, "notices"),
    NoticeRegistry: connection.model(
      "NoticeRegistry",
      NoticeRegistrySchema,
      "notice_registry",
    ),

    AuditLog: connection.model("AuditLog", AuditLogSchema, "auditlogs"),
    OwnershipHistory: connection.model(
      "OwnershipHistory",
      OwnershipHistorySchema,
      "ownershiphistories",
    ),
    TenantHistory: connection.model(
      "TenantHistory",
      TenantHistorySchema,
      "tenanthistories",
    ),
    SlipCounter: connection.model(
      "SlipCounter",
      SlipCounterSchema,
      "slipcounters",
    ),
    SlipRegistry: connection.model(
      "SlipRegistry",
      SlipRegistrySchema,
      "slipregistries",
    ),
    Complaint: connection.model("complaint", ComplaintSchema, "complaints"),
    ComplaintComment: connection.model(
      "ComplaintComment",
      ComplaintCommentSchema,
      "complaint_comments",
    ),
    Notification: connection.model(
      "Notification",
      NotificationSchema,
      "notifications",
    ),
  };
}

module.exports = { attachModels };
