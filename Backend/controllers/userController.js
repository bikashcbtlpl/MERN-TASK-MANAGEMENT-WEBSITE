const User = require("../models/User");
const bcrypt = require("bcryptjs");
const generatePassword = require("../utils/generatePassword");
const Document = require("../models/Document");
const { serializeUser, serializeAuthUser } = require("../utils/serializers");
const emailQueue = require("../queues/emailQueue");

// Allowed fields for update (whitelist to avoid mass assignment)
const ALLOWED_UPDATE_FIELDS = ["name", "email", "role", "status"];

const queueUserEmailSafely = async (payload) => {
  try {
    await emailQueue.add(payload);
    console.log(
      `[user-email] queued (${emailQueue.isNoop ? "direct-mode" : "redis-worker"}) -> ${payload?.subject} -> ${payload?.to}`,
    );
  } catch (e) {
    console.warn("[emailQueue] add failed:", e?.message || e);
  }
};

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

/* ================= GET ALL USERS ================= */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name status")
      .select("-password")
      .lean();
    res.json(users.map((u) => serializeUser(u)));
  } catch (error) {
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

/* ================= GET CURRENT USER ================= */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = req.user;

    res.json(serializeAuthUser(user));
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

    await queueUserEmailSafely({
      to: email,
      subject: "Your Account Was Created - Task Management System",
      text: `Welcome to the Task Management System!\n\nYour account has been created for ${email}.\nFor security reasons, credentials are not sent by email.\nPlease contact your administrator for secure credential handoff.\nLogin at: ${process.env.FRONTEND_URL || "http://localhost:5173"}`,
    });

    // Return user without password
    const { password, ...userWithoutPassword } = newUser.toObject();
    void password;
    res.status(201).json({
      ...serializeUser(userWithoutPassword),
      temporaryPassword: plainPassword,
      passwordDelivery:
        "Share this temporary password securely; it is not sent by email.",
    });
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
      { returnDocument: "after", runValidators: true },
    )
      .populate("role", "name")
      .select("-password")
      .lean();

    const previousStatus = normalizeStatus(userToUpdate.status);
    const nextStatus = normalizeStatus(updatedUser?.status);

    const statusChangedToInactive =
      Object.prototype.hasOwnProperty.call(updateData, "status") &&
      previousStatus !== "inactive" &&
      nextStatus === "inactive";
    const statusChangedToActive =
      Object.prototype.hasOwnProperty.call(updateData, "status") &&
      previousStatus === "inactive" &&
      nextStatus === "active";

    if (Object.prototype.hasOwnProperty.call(updateData, "status")) {
      console.log(
        `[user-email] status transition check for ${updatedUser?.email || req.params.id}: ${previousStatus} -> ${nextStatus}`,
      );
    }

    if (statusChangedToInactive && updatedUser?.email) {
      const actorName = loggedInUser?.name || loggedInUser?.email || "Administrator";
      await queueUserEmailSafely({
        to: updatedUser.email,
        subject: "Account Set to Inactive",
        text: `Hello ${updatedUser.name || "User"},\n\nYour account has been marked as inactive by ${actorName}.\nYou will not be able to access the system until it is reactivated.\n\nIf you think this is a mistake, please contact your administrator.`,
      });
    }
    if (statusChangedToActive && updatedUser?.email) {
      const actorName = loggedInUser?.name || loggedInUser?.email || "Administrator";
      await queueUserEmailSafely({
        to: updatedUser.email,
        subject: "Account Reactivated",
        text: `Hello ${updatedUser.name || "User"},\n\nYour account has been reactivated by ${actorName}.\nYou can now log in and access the system again.\n\nIf you were not expecting this change, please contact your administrator.`,
      });
    }

    res.json(serializeUser(updatedUser));
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
    await Document.updateMany(
      {},
      {
        $pull: {
          access: { user: req.params.id },
          accessRequests: req.params.id,
        },
      },
    );

    if (userToDelete.email) {
      const actorName = loggedInUser?.name || loggedInUser?.email || "Administrator";
      await queueUserEmailSafely({
        to: userToDelete.email,
        subject: "Account Deleted",
        text: `Hello ${userToDelete.name || "User"},\n\nYour account has been deleted by ${actorName}.\nYou no longer have access to the system.\n\nIf you think this is a mistake, please contact your administrator.`,
      });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
};
