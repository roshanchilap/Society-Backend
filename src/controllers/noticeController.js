//
// INTERNAL: send notice to all owners + tenants
//
async function sendToAll(req, { title, message, type }) {
  const users = await req.models.User.find({
    role: { $in: ["owner", "tenant"] },
  });

  const notices = users.map((u) => ({
    userId: u._id,
    title,
    message,
    type,
  }));

  await req.models.Notice.insertMany(notices);

  return { count: users.length, recipients: users.map((u) => u._id) };
}

//
// ADMIN: CREATE NOTICE
//
exports.createNotice = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    let { title, message, category, userId } = req.body;
    category = category?.toLowerCase();

    let sentToCount = 0;
    let recipients = [];
    let finalType = category || "general";

    /* ----------------------------------
       MEETING → all users
    ---------------------------------- */
    if (category === "meeting") {
      finalType = "meeting";

      const result = await sendToAll(req, {
        title,
        message,
        type: finalType,
      });

      sentToCount = result.count;
      recipients = result.recipients;

      // 🔔 notifications
      await req.models.Notification.insertMany(
        recipients.map((userId) => ({
          userId,
          type: "announcement",
          title: "New meeting notice",
          message: title,
        })),
      );
    } else if (category === "maintenance") {
      /* ----------------------------------
       MAINTENANCE → single user
    ---------------------------------- */
      if (!userId) {
        return res
          .status(400)
          .json({ message: "userId required for maintenance notice" });
      }

      finalType = "maintenance";

      const notice = await req.models.Notice.create({
        userId,
        title,
        message,
        type: finalType,
      });

      sentToCount = 1;
      recipients = [userId];

      // 🔔 notification
      await req.models.Notification.create({
        userId,
        type: "announcement",
        title: "Maintenance notice",
        message: title,
      });
    } else {
      /* ----------------------------------
       GENERAL / EVENT → all users
    ---------------------------------- */
      finalType = category || "general";

      const result = await sendToAll(req, {
        title,
        message,
        type: finalType,
      });

      sentToCount = result.count;
      recipients = result.recipients;

      // 🔔 notifications
      await req.models.Notification.insertMany(
        recipients.map((userId) => ({
          userId,
          type: "announcement",
          title: "New announcement",
          message: title,
        })),
      );
    }

    /* ----------------------------------
       Save registry
    ---------------------------------- */
    await req.models.NoticeRegistry.create({
      sentBy: req.user.id,
      title,
      message,
      type: finalType,
      sentToCount,
      recipients,
    });

    res.status(201).json({
      message: "Notice created",
      type: finalType,
      sentTo: sentToCount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating notice",
      error: err.message,
    });
  }
};

//
// USER: GET MY NOTICES
//
exports.getMyNotices = async (req, res) => {
  try {
    const notices = await req.models.Notice.find({
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    res.json(notices);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching notices",
      error: err.message,
    });
  }
};

//
// ADMIN: GET ALL NOTICES (raw duplicates)
//
exports.getAllNotices = async (req, res) => {
  try {
    const notices = await req.models.Notice.find({}).sort({ createdAt: -1 });
    res.json(notices);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching notices",
      error: err.message,
    });
  }
};

//
// ADMIN: GET UNIQUE NOTICES (REGISTRY)
//
exports.getRegistry = async (req, res) => {
  try {
    const records = await req.models.NoticeRegistry.find({}).sort({
      createdAt: -1,
    });

    res.json(records);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching registry",
      error: err.message,
    });
  }
};

//
// ✅ ADMIN: EDIT NOTICE (REGISTRY + RESEND NOTICES)
//
exports.updateNotice = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    let { title, message, category, userId } = req.body;
    category = category?.toLowerCase();

    let finalType = category || "general";

    const record = await req.models.NoticeRegistry.findById(id);
    if (!record) {
      return res.status(404).json({ message: "Registry entry not found" });
    }

    // ❌ delete old notices
    await req.models.Notice.deleteMany({
      _id: { $in: record.recipients },
    });

    let sentToCount = 0;
    let recipients = [];

    /* ----------------------------------
       MEETING → all users
    ---------------------------------- */
    if (category === "meeting") {
      finalType = "meeting";

      const result = await sendToAll(req, {
        title,
        message,
        type: finalType,
      });

      sentToCount = result.count;
      recipients = result.recipients;

      // 🔔 notifications
      await req.models.Notification.insertMany(
        recipients.map((userId) => ({
          userId,
          type: "announcement",
          title: "Meeting notice updated",
          message: title,
        })),
      );
    } else if (category === "maintenance") {

    /* ----------------------------------
       MAINTENANCE → single user
    ---------------------------------- */
      finalType = "maintenance";

      if (!userId) {
        return res.status(400).json({
          message: "userId required for maintenance notice",
        });
      }

      const notice = await req.models.Notice.create({
        userId,
        title,
        message,
        type: finalType,
      });

      sentToCount = 1;
      recipients = [userId];

      // 🔔 notification
      await req.models.Notification.create({
        userId,
        type: "announcement",
        title: "Maintenance notice updated",
        message: title,
      });
    } else {

    /* ----------------------------------
       GENERAL / EVENT → all users
    ---------------------------------- */
      finalType = category || "general";

      const result = await sendToAll(req, {
        title,
        message,
        type: finalType,
      });

      sentToCount = result.count;
      recipients = result.recipients;

      // 🔔 notifications
      await req.models.Notification.insertMany(
        recipients.map((userId) => ({
          userId,
          type: "announcement",
          title: "Announcement updated",
          message: title,
        })),
      );
    }

    // update registry
    record.title = title;
    record.message = message;
    record.type = finalType;
    record.recipients = recipients;
    record.sentToCount = sentToCount;

    await record.save();

    res.json({
      message: "Notice updated successfully",
      type: finalType,
      sentTo: sentToCount,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error updating notice",
      error: err.message,
    });
  }
};

//
// ✅ ADMIN: DELETE NOTICE (REGISTRY + ALL SENT NOTICES)
//
exports.deleteNotice = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;

    const record = await req.models.NoticeRegistry.findById(id);
    if (!record)
      return res.status(404).json({ message: "Registry entry not found" });

    // Delete all notices that were sent
    await req.models.Notice.deleteMany({
      _id: { $in: record.recipients },
    });

    // Delete registry record
    await req.models.NoticeRegistry.findByIdAndDelete(id);

    res.json({ message: "Notice deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting notice",
      error: err.message,
    });
  }
};
