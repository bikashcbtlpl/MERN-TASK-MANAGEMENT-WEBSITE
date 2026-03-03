const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user + populate role & permissions
    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate({
      path: "role",
      populate: {
        path: "permissions",
      },
    });

    // Use generic message to prevent email enumeration
    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check user status
    if (user.status !== "Active") {
      return res.status(403).json({
        message: "Your account is inactive. Please contact an administrator.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Ensure role is properly linked
    if (!user.role) {
      return res.status(500).json({ message: "User role not configured. Contact administrator." });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // Return user data (no sensitive fields)
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions: (user.role.permissions || []).map((p) => p.name),
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: "Server error",
    });
  }
};

/* ================= LOGOUT ================= */
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
};

/* ================= VERIFY TOKEN ================= */
exports.verify = async (req, res) => {
  try {
    const user = req.user; // from authMiddleware

    if (!user.role) {
      return res.status(500).json({ message: "User role not configured" });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        permissions: (user.role.permissions || []).map((p) => p.name),
      },
    });
  } catch (error) {
    console.error("Verify Error:", error);
    res.status(401).json({
      message: "Unauthorized",
    });
  }
};
