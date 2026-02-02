exports.changeTenant = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatId } = req.params;
    const { newTenantId, addedBy } = req.body;

    if (!flatId || !newTenantId) {
      return res.status(400).json({ message: "flatId and newTenantId are required" });
    }

    // ✅ Close current tenant record (if any)
    await req.models.TenantHistory.updateOne(
      { flatId, endDate: null },
      { $set: { endDate: new Date() } }
    );

    // ✅ Insert new tenant record
    const newRecord = new req.models.TenantHistory({
      flatId,
      tenantId: newTenantId,
      startDate: new Date(),
      addedBy: addedBy || req.user._id, // fallback to current admin
    });

    await newRecord.save();

    // ✅ Update flat current tenant
    const updatedFlat = await req.models.Flat.findByIdAndUpdate(
      flatId,
      { tenantId: newTenantId },
      { new: true }
    );

    if (!updatedFlat) {
      return res.status(404).json({ message: "Flat not found" });
    }

    res.json({
      success: true,
      message: "Tenant changed successfully",
      record: newRecord,
      flat: updatedFlat,
    });
  } catch (err) {
    console.error("ChangeTenant error:", err);
    res.status(500).json({
      message: "Error changing tenant",
      error: err.message,
    });
  }
};

exports.getTenantHistory = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatId } = req.params;

    if (!flatId) {
      return res.status(400).json({ message: "flatId is required" });
    }

    const history = await req.models.TenantHistory.find({ flatId })
      .populate("tenantId", "name email")
      .populate("addedBy", "name email")
      .sort({ startDate: 1 });

    res.json({
      success: true,
      history,
    });
  } catch (err) {
    console.error("GetTenantHistory error:", err);
    res.status(500).json({
      message: "Error fetching tenant history",
      error: err.message,
    });
  }
};