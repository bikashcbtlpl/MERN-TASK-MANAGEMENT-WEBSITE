const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2️⃣ Find user + populate role & permissions
    const user = await User.findOne({ email }).populate({
      path: "role",
      populate: {
        path: "permissions",
      },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // 3️⃣ Check user status
    if (user.status !== "Active") {
      return res.status(403).json({
        message: "User account is inactive",
      });
    }

    // 4️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    // 5️⃣ Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 6️⃣ Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // auto secure in prod
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    // 7️⃣ Send user data (NO sensitive fields)
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.name),
        sessionTimeout: 30,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

// ================= LOGOUT =================
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
};

exports.verify = async (req, res) => {
  try {
    const user = req.user; // from authMiddleware

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.name),
      },
    });

  } catch (error) {
    res.status(401).json({
      message: "Unauthorized",
    });
  }
};
