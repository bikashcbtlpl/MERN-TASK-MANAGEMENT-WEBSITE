const User = require("../models/User");
const bcrypt = require("bcryptjs");

/* ================= GET SETTINGS ================= */
exports.getSettings = async (req, res) => {
  try {
    const user = req.user;

    res.json({
      profile: {
        name: user.name,
        email: user.email,
      },
      emailConfig: {
        smtpHost: "",
        smtpPort: "",
        senderEmail: "",
      },
      security: {
        minPasswordLength: 6,
        enableRegistration: true,
        sessionTimeout: 30,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching settings" });
  }
};

/* ================= UPDATE PROFILE ================= */
exports.updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = req.user;

    if (name !== undefined) {
      user.name = name;
    }

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      name: user.name, // return updated name
    });

  } catch (error) {
    res.status(500).json({ message: "Profile update failed" });
  }
};


/* ================= UPDATE EMAIL SETTINGS ================= */
exports.updateEmailSettings = async (req, res) => {
  try {
    // For now just return success
    res.json({ message: "Email settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Email settings update failed" });
  }
};

/* ================= UPDATE SECURITY SETTINGS ================= */
exports.updateSecuritySettings = async (req, res) => {
  try {
    // For now just return success
    res.json({ message: "Security settings updated" });
  } catch (error) {
    res.status(500).json({ message: "Security settings update failed" });
  }
};
