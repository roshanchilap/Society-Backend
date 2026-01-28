const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const SuperUser = require("../models/SuperUser");
const Society = require("../models/Society");
const { attachModels } = require("../services/attachModels");

const tenantConnections = {}; // cache tenant connections

/* =====================================================
   SUPER USER LOGIN (MASTER DB)
===================================================== */
exports.superLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const superUser = await SuperUser.findOne({ email });

    if (!superUser) {
      return res.status(404).json({ message: "Super user not found" });
    }
    const isMatch = await bcrypt.compare(password, superUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: superUser._id,
        role: superUser.role,
        type: "super",
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({
      token,
      user: {
        _id: superUser._id,
        role: superUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error logging in super user",
      error: err.message,
    });
  }
};

/* =====================================================
   SOCIETY USER LOGIN (ADMIN / OWNER / TENANT)
===================================================== */
exports.societyLogin = async (req, res) => {
  try {
    const { societyCode, email, password } = req.body;

    // 1️⃣ Find society (master DB)
    const society = await Society.findOne({ code: societyCode });
    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }

    // 2️⃣ Create / reuse tenant connection
    if (!tenantConnections[society._id]) {
      const conn = mongoose.createConnection(society.dbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      conn.on("connected", () =>
        console.log(`Tenant DB connected: ${society._id}`),
      );
      conn.on("error", (err) =>
        console.error(`Tenant DB error (${society._id}):`, err),
      );

      tenantConnections[society._id] = {
        conn,
        models: attachModels(conn),
      };
    }

    const { User } = tenantConnections[society._id].models;

    // 3️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 5️⃣ Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        societyId: society._id,
        type: "society",
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    // 6️⃣ Send normalized response
    res.json({
      token,
      societyId: society._id,
      society: society.name,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        flatId: user.flatId || null,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error logging in society user",
      error: err.message,
    });
  }
};

/* =====================================================
   AUTH ME (Validate JWT and return user context)
===================================================== */
exports.me = async (req, res) => {
  try {
    // Super user case
    if (req.user.type === "super") {
      return res.json({ valid: true, user: req.user });
    }

    // Society user case
    const societyId = req.user.societyId || req.headers["x-society-id"];
    if (!societyId) {
      return res
        .status(400)
        .json({ message: "No societyId in token or header" });
    }

    const society = await Society.findById(societyId);
    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }

    if (!tenantConnections[societyId]) {
      const conn = mongoose.createConnection(society.dbUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });

      conn.on("connected", () =>
        console.log(`Tenant DB connected: ${societyId}`),
      );
      conn.on("error", (err) =>
        console.error(`Tenant DB error (${societyId}):`, err),
      );

      tenantConnections[societyId] = {
        conn,
        models: attachModels(conn),
      };
    }

    req.models = tenantConnections[societyId].models;

    return res.json({ valid: true, user: req.user });
  } catch (err) {
    return res.status(500).json({
      message: "Error validating session",
      error: err.message,
    });
  }
};
