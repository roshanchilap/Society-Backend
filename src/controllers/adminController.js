const bcrypt = require("bcrypt");
const { MasterSociety } = require("../db/masterDb"); // use master DB registry
const { attachModels } = require("../services/attachModels");
const mongoose = require("mongoose");

const tenantConnections = {}; // cache tenant connections

exports.createAdmin = async (req, res) => {
  try {
    if (req.user.role !== "super") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { societyId, name, email, password, phoneno } = req.body;

    const society = await MasterSociety.findById(societyId).lean();

    if (!society || !society.dbUri) {
      return res.status(404).json({ message: "Society not found" });
    }

    if (!tenantConnections[societyId]) {
      const conn = mongoose.createConnection(society.dbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      conn.on("connected", () =>
        console.log(`Tenant DB connected for society ${societyId}`),
      );
      conn.on("error", (err) =>
        console.error(`Tenant DB error for society ${societyId}:`, err),
      );

      tenantConnections[societyId] = {
        conn,
        models: attachModels(conn),
      };
    }

    const { User } = tenantConnections[societyId].models;

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role: "admin",
      phoneno,
      createdBy: req.user._id,
    });

    await admin.save();

    res.status(201).json({
      message: "Admin created successfully",
      adminId: admin._id,
    });
  } catch (err) {
    console.error("createAdmin error:", err);
    res.status(500).json({
      message: "Error creating admin",
      error: err.message,
    });
  }
};
