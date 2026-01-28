exports.changeTenant = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { flatId } = req.params;
    const { newTenantId, addedBy } = req.body;

    // Close current tenant record
    await req.models.TenantHistory.updateOne(
      { flatId, endDate: null },
      { $set: { endDate: new Date() } }
    );

    // Insert new tenant record
    const newRecord = new req.models.TenantHistory({
      flatId,
      tenantId: newTenantId,
      startDate: new Date(),
      addedBy,
    });
    await newRecord.save();

    // Update flat current tenant
    await req.models.Flat.findByIdAndUpdate(flatId, { tenantId: newTenantId });

    res.json({ message: "Tenant changed successfully", record: newRecord });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error changing tenant", error: err.message });
  }
};

exports.getTenantHistory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { flatId } = req.params;
    const history = await req.models.TenantHistory.find({ flatId })
      .populate("tenantId", "name")
      .populate("addedBy", "name")
      .sort({ startDate: 1 });
    res.json(history);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tenant history", error: err.message });
  }
};
