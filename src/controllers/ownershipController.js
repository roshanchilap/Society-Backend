const OwnershipHistory = require("../models/OwnershipHistory");
const Flat = require("../models/Flat");

exports.transferOwnership = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatId } = req.params;
    const { newOwnerId, transferReason } = req.body;

    // Close current ownership record
    await req.models.OwnershipHistory.updateOne(
      { flatId, endDate: null },
      { $set: { endDate: new Date() } },
    );

    // Insert new ownership record
    const newRecord = new req.models.OwnershipHistory({
      flatId,
      ownerId: newOwnerId,
      startDate: new Date(),
      transferReason,
    });
    await newRecord.save();

    // Update flat current owner
    await req.models.Flat.findByIdAndUpdate(flatId, { ownerId: newOwnerId });

    res.json({
      message: "Ownership transferred successfully",
      record: newRecord,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error transferring ownership", error: err.message });
  }
};

exports.getOwnershipHistory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatId } = req.params;
    const history = await req.models.OwnershipHistory.find({ flatId })
      .populate("ownerId", "name email role") // ✅ populate owner details
      .sort({ startDate: 1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching ownership history",
      error: err.message,
    });
  }
};
