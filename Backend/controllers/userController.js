const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generatePassword = require("../utils/generatePassword");

// Allowed fields for update (whitelist to avoid mass assignment)
const ALLOWED_UPDATE_FIELDS = ["name", "email", "role", "status"];

/* ================= GET ALL USERS ================= */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name status")
      .select("-password")
      .lean();
    res.json(users);
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/* ================= GET CURRENT USER ================= */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: (user.role.permissions || []).map((p) => p.name),
    });
  } catch (error) {
    console.error("Get Current User Error:", error);
    res.status(500).json({ message: "Error fetching user" });
  }
};

/* ================= CREATE USER ================= */
exports.createUser = async (req, res) => {
  try {
    const { name, email, role, status } = req.body;

    // Validate required fields
    if (!email || !role) {
      return res.status(400).json({ message: "Email and role are required" });
    }

    // Check existing user
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    }).lean();
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Generate and hash password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const newUser = await User.create({
      name: name?.trim() || "",
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      status: status || "Active",
    });

    // Queue welcome email with credentials
    try {
      const emailQueue = require("../queues/emailQueue");
      await emailQueue.add({
        to: email,
        subject: "Your Login Credentials - Task Management System",
        text: `Welcome to the Task Management System!\n\nYour login credentials:\nEmail: ${email}\nPassword: ${plainPassword}\n\nPlease login and change your password immediately.\nLogin at: ${process.env.FRONTEND_URL || "http://localhost:5173"}`,
      });
    } catch (emailErr) {
      console.warn("Warning: Could not queue welcome email:", emailErr.message);
    }

    // Return user without password
    const { password, ...userWithoutPassword } = newUser.toObject();
    void password;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error("Create User Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }
    res.status(500).json({ message: "Error creating user" });
  }
};

/* ================= UPDATE USER ================= */
exports.updateUser = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const userToUpdate = await User.findById(req.params.id)
      .populate("role")
      .lean();

    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protect Super Admin account from non-Super Admin
    if (
      userToUpdate.role?.name === "Super Admin" &&
      loggedInUser.role?.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can modify a Super Admin account",
      });
    }

    // Whitelist update fields to prevent mass assignment
    const updateData = {};
    ALLOWED_UPDATE_FIELDS.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    });

    // Sanitize email if provided
    if (updateData.email) {
      updateData.email = updateData.email.toLowerCase().trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    )
      .populate("role", "name")
      .select("-password")
      .lean();

    res.json(updatedUser);
  } catch (error) {
    console.error("Update User Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Error updating user" });
  }
};

/* ================= DELETE USER ================= */
exports.deleteUser = async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Prevent deleting yourself
    if (String(req.params.id) === String(loggedInUser._id)) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    const userToDelete = await User.findById(req.params.id)
      .populate("role")
      .lean();

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // Protect Super Admin account
    if (
      userToDelete.role?.name === "Super Admin" &&
      loggedInUser.role?.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can delete a Super Admin account",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};
