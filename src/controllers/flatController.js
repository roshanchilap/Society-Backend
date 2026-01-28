// controllers/flatController.js
const Society = require("../models/Society");

// controllers/flatController.js

// ✅ Create Flat (Admin only)
exports.createFlat = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatNumber, areaSqFt, tower, floor } = req.body;

    const flat = new req.models.Flat({
      flatNumber,
      areaSqFt,
      address: { tower, floor },
    });

    await flat.save();

    res.status(201).json({
      message: "Flat created successfully",
      flatId: flat._id,
    });
  } catch (err) {
    res.status(500).json({
      message: "Error creating flat",
      error: err.message,
    });
  }
};

// ✅ Get All Flats (Admin only)
exports.getAllFlats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const flats = await req.models.Flat.find()
      .populate("ownerId", "name email role")
      .populate("tenantId", "name email role");

    res.json(flats);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching flats", error: err.message });
  }
};

// ✅ Get Flat by ID (Admin, Owner, Tenant)
exports.getFlatById = async (req, res) => {
  try {
    const { role } = req.user;
    const { flatId } = req.params;

    const flat = await req.models.Flat.findById(flatId).populate(
      "flatId address"
    );
    if (!flat) return res.status(404).json({ message: "Flat not found" });

    if (role === "tenant") {
      return res.json({
        flatNumber: flat.flatNumber,
        address: flat.address,
      });
    }

    res.json(flat);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching flat", error: err.message });
  }
};

// ✅ Update Flat (Admin only)
exports.updateFlat = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatId } = req.params;
    const { flatNumber, areaSqFt, tower, floor } = req.body;

    const flat = await req.models.Flat.findByIdAndUpdate(
      flatId,
      { flatNumber, areaSqFt, address: { tower, floor } },
      { new: true }
    );

    if (!flat) return res.status(404).json({ message: "Flat not found" });

    res.json({ message: "Flat updated successfully", flat });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating flat", error: err.message });
  }
};

// ✅ Delete Flat (Admin only)
exports.deleteFlat = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { flatId } = req.params;

    const flat = await req.models.Flat.findByIdAndDelete(flatId);
    if (!flat) return res.status(404).json({ message: "Flat not found" });

    res.json({ message: "Flat deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting flat", error: err.message });
  }
};
