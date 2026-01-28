exports.getAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const logs = await req.models.AuditLog.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching audit logs", error: err.message });
  }
};
