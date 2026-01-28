const { apiError } = require("../utils/apiError");

/* ----------------------------------
   Get my notifications
---------------------------------- */
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await req.models.Notification.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    console.error(err);
    return apiError(
      res,
      500,
      "FETCH_NOTIFICATIONS_FAILED",
      "Failed to load notifications",
    );
  }
};

/* ----------------------------------
   Get unread count
---------------------------------- */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await req.models.Notification.countDocuments({
      userId: req.user.id,
      isRead: false,
    });

    res.json({ success: true, count });
  } catch (err) {
    return apiError(
      res,
      500,
      "FETCH_UNREAD_COUNT_FAILED",
      "Failed to load count",
    );
  }
};

/* ----------------------------------
   Mark one as read
---------------------------------- */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await req.models.Notification.updateOne(
      { _id: id, userId: req.user.id },
      { $set: { isRead: true } },
    );

    res.json({ success: true });
  } catch (err) {
    return apiError(res, 500, "MARK_READ_FAILED", "Failed to update");
  }
};

/* ----------------------------------
   Mark all as read
---------------------------------- */
exports.markAllAsRead = async (req, res) => {
  try {
    await req.models.Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } },
    );

    res.json({ success: true });
  } catch (err) {
    return apiError(res, 500, "MARK_ALL_READ_FAILED", "Failed to update");
  }
};
