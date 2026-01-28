// controllers/userController.js
const bcrypt = require("bcrypt");
const { apiError } = require("../utils/apiError");
// -----------------------------------------------
// CREATE USER (Owner or Tenant) & Assign to Flat
// -----------------------------------------------

exports.createUserForFlat = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return apiError(
        res,
        403,
        "NOT_AUTHORIZED",
        "Only admin can create users",
      );
    }

    const { flatId, name, email, password, role, phoneno } = req.body;

    if (!name || !email || !password || !role || !flatId) {
      return apiError(
        res,
        400,
        "MISSING_FIELDS",
        "All required fields must be filled",
      );
    }

    if (!phoneno) {
      return apiError(res, 400, "PHONE_REQUIRED", "Phone number is required");
    }

    if (!["owner", "tenant"].includes(role)) {
      return apiError(
        res,
        400,
        "INVALID_ROLE",
        "Only owner or tenant role is allowed",
      );
    }

    const existingUser = await req.models.User.findOne({ email });
    if (existingUser) {
      return apiError(res, 409, "EMAIL_EXISTS", "Email is already registered");
    }

    const flat = await req.models.Flat.findById(flatId);
    if (!flat) {
      return apiError(
        res,
        404,
        "FLAT_NOT_FOUND",
        "Selected flat does not exist",
      );
    }

    if (role === "owner" && flat.ownerId) {
      return apiError(
        res,
        409,
        "OWNER_EXISTS",
        "This flat already has an owner",
      );
    }

    if (role === "tenant" && flat.tenantId) {
      return apiError(
        res,
        409,
        "TENANT_EXISTS",
        "This flat already has a tenant",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new req.models.User({
      name,
      email,
      passwordHash: hashedPassword,
      role,
      flatId,
      phoneno,
      createdBy: req.user.id,
    });

    await user.save();

    if (role === "owner") flat.ownerId = user._id;
    if (role === "tenant") flat.tenantId = user._id;

    flat.status = "occupied";
    await flat.save();

    res.status(201).json({
      success: true,
      message: `${role} created and assigned successfully`,
      userId: user._id,
    });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return apiError(
        res,
        409,
        "DUPLICATE_KEY",
        "Duplicate value detected (email or phone already exists)",
      );
    }

    return apiError(
      res,
      500,
      "CREATE_USER_FAILED",
      "Failed to create user. Please try again",
    );
  }
};

// -----------------------------------------------
// GET ALL USERS
// -----------------------------------------------
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const users = await req.models.User.find()
      .populate("flatId", "flatNumber address tower floor phoneno")
      .populate("createdBy", "name");

    res.status(200).json({
      count: users.length,
      users,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching users", error: err.message });
  }
};

// -----------------------------------------------
// GET SINGLE USER
// -----------------------------------------------
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await req.models.User.findById(userId)
      .populate("flatId", "flatNumber address tower floor phoneno")
      .populate("createdBy", "name");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
};

// -----------------------------------------------
// UPDATE USER (name, email, password, role, flat)
// -----------------------------------------------
exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return apiError(
        res,
        403,
        "NOT_AUTHORIZED",
        "Only admin can update users",
      );
    }

    const { userId } = req.params;
    const { name, email, password, role, flatId, phoneno } = req.body;

    const user = await req.models.User.findById(userId);
    if (!user) {
      return apiError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    if (!phoneno) {
      return apiError(res, 400, "PHONE_REQUIRED", "Phone number is required");
    }

    if (email && email !== user.email) {
      const exists = await req.models.User.findOne({ email });
      if (exists) {
        return apiError(res, 409, "EMAIL_EXISTS", "Email is already in use");
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phoneno) user.phoneno = phoneno;
    if (role) user.role = role;
    if (password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();

    res.json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error(err);

    return apiError(res, 500, "UPDATE_FAILED", "Failed to update user");
  }
};

// -----------------------------------------------
// DELETE USER + Auto-update flat status
// -----------------------------------------------
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return apiError(
        res,
        403,
        "NOT_AUTHORIZED",
        "Only admin can delete users",
      );
    }

    const { userId } = req.params;

    const user = await req.models.User.findById(userId);
    if (!user) {
      return apiError(res, 404, "USER_NOT_FOUND", "User not found");
    }

    await req.models.User.deleteOne({ _id: userId });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error(err);

    return apiError(res, 500, "DELETE_FAILED", "Failed to delete user");
  }
};
