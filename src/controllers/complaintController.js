const mongoose = require("mongoose");
const { apiError } = require("../utils/apiError");

/**
 * GET SINGLE COMPLAINT
 */
exports.getComplaintById = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await req.models.Complaint.findById(complaintId)
      .populate("createdBy", "name role")
      .populate("assignedAdmins", "name")
      .populate("assignedUsers", "name")
      .populate("flatId", "tower flatNumber");

    if (!complaint) {
      return apiError(res, 404, "COMPLAINT_NOT_FOUND", "Complaint not found");
    }

    const isSameFlat =
      complaint.flatId &&
      req.user.flatId &&
      complaint.flatId._id.toString() === req.user.flatId.toString();

    if (
      req.user.role !== "admin" &&
      complaint.createdBy._id.toString() !== req.user.id &&
      !isSameFlat
    ) {
      return apiError(res, 403, "FORBIDDEN", "You are not allowed");
    }

    res.json({ success: true, complaint });
  } catch (err) {
    console.error(err);
    return apiError(
      res,
      500,
      "FETCH_COMPLAINT_FAILED",
      "Failed to fetch complaint",
    );
  }
};

/**
 * ASSIGN COMPLAINT (Admin only)
 */
exports.assignComplaint = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return apiError(res, 403, "NOT_AUTHORIZED", "Only admin allowed");
    }

    const { complaintId } = req.params;
    const { adminIds = [], userIds = [] } = req.body;

    const complaint = await req.models.Complaint.findById(complaintId);
    if (!complaint) {
      return apiError(res, 404, "COMPLAINT_NOT_FOUND", "Complaint not found");
    }

    complaint.assignedAdmins = adminIds;
    complaint.assignedUsers = userIds;
    complaint.lastUpdatedBy = req.user.id;

    await complaint.save();

    res.json({ success: true, message: "Complaint assigned successfully" });
  } catch (err) {
    console.error(err);
    return apiError(res, 500, "ASSIGN_FAILED", "Failed to assign complaint");
  }
};

/**
 * CREATE COMPLAINT
 */
exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, priority, flatId, isPrivate } =
      req.body;

    if (!title || !description) {
      return apiError(
        res,
        400,
        "MISSING_FIELDS",
        "Title and description required",
      );
    }

    let resolvedFlatId;

    if (req.user.role === "admin") {
      if (!flatId) {
        return apiError(res, 400, "FLAT_REQUIRED", "Flat is required");
      }
      resolvedFlatId = new mongoose.Types.ObjectId(flatId);
    } else {
      if (!req.user.flatId) {
        return apiError(res, 400, "NO_FLAT_ASSIGNED", "No flat assigned");
      }
      resolvedFlatId = new mongoose.Types.ObjectId(req.user.flatId);
    }

    const complaint = new req.models.Complaint({
      title,
      description,
      category,
      priority,
      flatId: resolvedFlatId,
      isPrivate: !!isPrivate,
      createdBy: req.user.id,
      assignedAdmins: [],
      assignedUsers: [],
      status: "open",
      lastUpdatedBy: req.user.id,
    });

    await complaint.save();

    /* 🔔 NOTIFICATIONS */
    if (req.models.Notification) {
      const notified = new Set();

      // Admin creates → notify flat users
      if (req.user.role === "admin") {
        const flatUsers = await req.models.User.find({
          flatId: resolvedFlatId,
        }).select("_id");

        const userNotifs = flatUsers
          .filter((u) => u._id.toString() !== req.user.id)
          .map((u) => {
            notified.add(u._id.toString());
            return {
              userId: u._id,
              type: "complaint_created",
              title: "New complaint created for your flat",
              message: title,
              meta: { complaintId: complaint._id, flatId: resolvedFlatId },
            };
          });

        if (userNotifs.length) {
          await req.models.Notification.insertMany(userNotifs);
        }
      }

      // Notify admins (except creator & deduped)
      const admins = await req.models.User.find({ role: "admin" }).select(
        "_id",
      );

      const adminNotifs = admins
        .filter(
          (a) =>
            a._id.toString() !== req.user.id && !notified.has(a._id.toString()),
        )
        .map((a) => ({
          userId: a._id,
          type: "complaint_created",
          title: "New complaint submitted",
          message: title,
          meta: { complaintId: complaint._id, flatId: resolvedFlatId },
        }));

      if (adminNotifs.length) {
        await req.models.Notification.insertMany(adminNotifs);
      }
    }

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully",
      complaintId: complaint._id,
    });
  } catch (err) {
    console.error("CREATE_COMPLAINT_ERROR:", err);
    return apiError(
      res,
      500,
      "CREATE_COMPLAINT_FAILED",
      err.message || "Failed to submit complaint",
    );
  }
};

/**
 * GET ALL COMPLAINTS
 */
exports.getComplaints = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role !== "admin") {
      filter = {
        $or: [{ createdBy: req.user.id }, { flatId: req.user.flatId }],
      };
    }

    const complaints = await req.models.Complaint.find(filter)
      .populate("createdBy", "name role")
      .populate("assignedAdmins", "name")
      .populate("assignedUsers", "name")
      .populate("flatId", "tower flatNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    console.error(err);
    return apiError(
      res,
      500,
      "FETCH_COMPLAINTS_FAILED",
      "Failed to fetch complaints",
    );
  }
};

/**
 * UPDATE COMPLAINT STATUS
 */
exports.updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    const allowed = ["open", "in_progress", "resolved", "closed"];
    if (!allowed.includes(status)) {
      return apiError(res, 400, "INVALID_STATUS", "Invalid status");
    }

    const complaint = await req.models.Complaint.findById(complaintId);
    if (!complaint) {
      return apiError(res, 404, "COMPLAINT_NOT_FOUND", "Complaint not found");
    }

    const isAssignedAdmin = complaint.assignedAdmins.some(
      (a) => a.toString() === req.user.id,
    );

    if (req.user.role !== "admin" && !isAssignedAdmin) {
      return apiError(res, 403, "NOT_ALLOWED", "Not allowed");
    }

    complaint.status = status;
    complaint.lastUpdatedBy = req.user.id;
    await complaint.save();

    /* ----------------------------------
       🔔 NOTIFICATIONS (FIXED)
    ---------------------------------- */

    if (req.models.Notification) {
      const notified = new Set();

      // 1️⃣ Notify complaint creator (if not self)
      if (complaint.createdBy.toString() !== req.user.id) {
        notified.add(complaint.createdBy.toString());

        await req.models.Notification.create({
          userId: complaint.createdBy,
          type: "complaint_status",
          title: "Complaint status updated",
          message: `Status changed to ${status.replace("_", " ")}`,
          meta: { complaintId },
        });
      }

      // 2️⃣ Notify flat users (important when admin created complaint)
      if (complaint.flatId) {
        const flatUsers = await req.models.User.find({
          flatId: complaint.flatId,
        }).select("_id");

        const flatNotifications = flatUsers
          .filter(
            (u) =>
              u._id.toString() !== req.user.id &&
              !notified.has(u._id.toString()),
          )
          .map((u) => ({
            userId: u._id,
            type: "complaint_status",
            title: "Complaint status updated",
            message: `Status changed to ${status.replace("_", " ")}`,
            meta: { complaintId },
          }));

        if (flatNotifications.length) {
          await req.models.Notification.insertMany(flatNotifications);
        }
      }
    }

    res.json({ success: true, message: "Status updated" });
  } catch (err) {
    console.error("STATUS_UPDATE_ERROR:", err);
    return apiError(
      res,
      500,
      "STATUS_UPDATE_FAILED",
      err.message || "Failed to update status",
    );
  }
};

/**
 * UPDATE COMPLAINT
 */
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority } = req.body;

    const complaint = await req.models.Complaint.findById(id);
    if (!complaint) {
      return apiError(res, 404, "COMPLAINT_NOT_FOUND", "Complaint not found");
    }

    const isAdmin = req.user.role === "admin";
    const isOwner =
      complaint.createdBy.toString() === req.user.id &&
      complaint.status === "open";

    if (!isAdmin && !isOwner) {
      return apiError(res, 403, "FORBIDDEN", "Not allowed");
    }

    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (category) complaint.category = category;
    if (priority) complaint.priority = priority;

    await complaint.save();

    await req.models.AuditLog.create({
      action: "update",
      collection: "Complaint",
      recordId: complaint._id,
      userId: req.user.id,
      details: { title, category, priority },
    });

    res.json({ success: true, complaint });
  } catch (err) {
    console.error(err);
    return apiError(res, 500, "UPDATE_FAILED", "Failed to update complaint");
  }
};

/**
 * DELETE COMPLAINT
 */
exports.deleteComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await req.models.Complaint.findById(complaintId);
    if (!complaint) {
      return apiError(res, 404, "COMPLAINT_NOT_FOUND", "Complaint not found");
    }

    await req.models.Complaint.deleteOne({ _id: complaintId });

    res.json({ success: true, message: "Complaint deleted successfully" });
  } catch (err) {
    console.error(err);
    return apiError(res, 500, "DELETE_FAILED", "Failed to delete complaint");
  }
};
