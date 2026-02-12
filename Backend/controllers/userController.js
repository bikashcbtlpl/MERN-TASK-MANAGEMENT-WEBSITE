const User = require("../models/User");
const Role = require("../models/Role");
const bcrypt = require("bcryptjs");
const generatePassword = require("../utils/generatePassword");
const sendEmail = require("../utils/sendEmail");

// ================= GET USERS =================
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate("role", "name");
    res.json(users);
  } catch (error) {
    console.log("Get Users Error:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      id: user._id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map(p => p.name),
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching user" });
  }
};


// ================= CREATE USER =================
exports.createUser = async (req, res) => {
  try {
    const { email, role, status } = req.body;

    // Check existing
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate password
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      role,
      status,
    });

    // Send email
    await sendEmail(
      email,
      "Your Login Credentials",
      `Welcome!

Email: ${email}
Password: ${plainPassword}

Login at: http://localhost:3000`
    );

    res.status(201).json(newUser);
  } catch (error) {
    console.log("Create User Error:", error);
    res.status(500).json({ message: "Error creating user" });
  }
};

// ================= UPDATE USER =================
exports.updateUser = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const userToUpdate = await User.findById(req.params.id).populate("role");

    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Protect Super Admin account
    if (
      userToUpdate.role.name === "Super Admin" &&
      loggedInUser.role.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can modify this user",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: "Error updating user" });
  }
};


// ================= DELETE USER =================
exports.deleteUser = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const userToDelete = await User.findById(req.params.id).populate("role");

    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Protect Super Admin account
    if (
      userToDelete.role.name === "Super Admin" &&
      loggedInUser.role.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can delete this user",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting user" });
  }
};
