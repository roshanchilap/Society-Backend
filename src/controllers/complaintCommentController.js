const ComplaintSchema = require("../models/Complaint");
const ComplaintCommentSchema = require("../models/ComplaintComment");
const { apiError } = require("../utils/apiError");

/**
 * GET comments
 */
exports.getComments = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const comments = await req.models.ComplaintComment.find({ complaintId })
      .populate("createdBy", "name role")
      .sort({ createdAt: 1 })
      .lean();

    comments.forEach((c) => {
      c.createdBy._id = c.createdBy._id.toString();
    });

    res.json({
      success: true,
      comments,
      me: req.user.id,
    });
  } catch (err) {
    console.error(err);
    return apiError(
      res,
      500,
      "FETCH_COMMENTS_FAILED",
      "Failed to load comments",
    );
  }
};

/**
 * ADD comment (FIXED notifications)
 */
exports.addComment = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return apiError(res, 400, "MESSAGE_REQUIRED", "Comment cannot be empty");
    }

    // fetch complaint
    const complaint = await req.models.Complaint.findById(complaintId)
      .select("createdBy")
      .lean();

    if (!complaint) {
      return apiError(res, 404, "NOT_FOUND", "Complaint not found");
    }

    // save comment
    const comment = new req.models.ComplaintComment({
      complaintId,
      message,
      createdBy: req.user.id,
    });

    await comment.save();

    /* ----------------------------------
       Notifications (DEDUPED)
    ---------------------------------- */

    const notifiedUsers = new Set();

    // 1️⃣ notify complaint owner (if not commenter)
    if (complaint.createdBy.toString() !== req.user.id) {
      notifiedUsers.add(complaint.createdBy.toString());

      await req.models.Notification.create({
        userId: complaint.createdBy,
        type: "complaint_comment",
        title: "New comment on your complaint",
        message: message.slice(0, 100),
        meta: { complaintId },
      });
    }

    // 2️⃣ notify admins (except commenter & already notified)
    if (req.user.role !== "admin") {
      const admins = await req.models.User.find({ role: "admin" })
        .select("_id")
        .lean();

      const adminNotifications = admins
        .filter(
          (a) =>
            a._id.toString() !== req.user.id &&
            !notifiedUsers.has(a._id.toString()),
        )
        .map((a) => ({
          userId: a._id,
          type: "complaint_comment",
          title: "New comment on complaint",
          message: message.slice(0, 100),
          meta: { complaintId },
        }));

      if (adminNotifications.length) {
        await req.models.Notification.insertMany(adminNotifications);
      }
    }

    res.status(201).json({
      success: true,
      message: "Comment added",
    });
  } catch (err) {
    console.error(err);
    return apiError(res, 500, "ADD_COMMENT_FAILED", "Failed to add comment");
  }
};
