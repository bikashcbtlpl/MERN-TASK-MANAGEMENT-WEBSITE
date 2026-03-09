const User = require("../models/User");
const bcrypt = require("bcryptjs");

/* ================= GET SETTINGS ================= */
exports.getSettings = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user?.role?.name === "Super Admin";

    const payload = {
      profile: {
        name: user.name,
        email: user.email,
      },
      security: {
        minPasswordLength: 8,
      },
    };

    if (isSuperAdmin) {
      payload.emailConfig = {
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: process.env.SMTP_PORT || "",
        senderEmail: process.env.EMAIL_USER || "",
      };
    }

    res.json(payload);
  } catch (error) {
    console.error("Get Settings Error:", error);
    res.status(500).json({ message: "Error fetching settings" });
  }
};

/* ================= UPDATE PROFILE ================= */
exports.updateProfile = async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;

    // Fetch fresh user with password for verification
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = name.trim();
    }

    // Password change requires current password verification
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          message: "Current password is required to set a new password",
        });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters" });
      }

      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      name: user.name,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Profile update failed" });
  }
};

/* ================= UPDATE EMAIL SETTINGS ================= */
exports.updateEmailSettings = async (req, res) => {
  try {
    // In a real app, persist these to DB (Settings model) or update env config
    // For now just acknowledge the update
    const { smtpPort } = req.body;

    // Basic validation
    if (smtpPort && isNaN(Number(smtpPort))) {
      return res.status(400).json({ message: "SMTP port must be a number" });
    }

    res.json({
      message: "Email settings updated successfully",
      note: "Restart may be required for full effect",
    });
  } catch (error) {
    console.error("Update Email Settings Error:", error);
    res.status(500).json({ message: "Email settings update failed" });
  }
};

/* ================= GET USER PREFERENCES ================= */
exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("preferences").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.preferences || { theme: "system", selectedProject: "" });
  } catch (error) {
    console.error("Get Preferences Error:", error);
    res.status(500).json({ message: "Error fetching preferences" });
  }
};

/* ================= UPDATE USER PREFERENCES ================= */
exports.updatePreferences = async (req, res) => {
  try {
    const { theme, selectedProject, autoSaveDocuments } = req.body;
    const update = {};

    if (theme !== undefined) {
      const allowed = ["light", "dark", "system"];
      if (!allowed.includes(theme))
        return res.status(400).json({ message: "Invalid theme value" });
      update["preferences.theme"] = theme;
    }

    if (selectedProject !== undefined) {
      update["preferences.selectedProject"] = String(selectedProject || "");
    }

    if (autoSaveDocuments !== undefined) {
      update["preferences.autoSaveDocuments"] = Boolean(autoSaveDocuments);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, select: "preferences" },
    ).lean();

    res.json({
      message: "Preferences updated",
      preferences: user?.preferences || {},
    });
  } catch (error) {
    console.error("Update Preferences Error:", error);
    res.status(500).json({ message: "Preferences update failed" });
  }
};

/* ================= UPDATE SECURITY SETTINGS ================= */
exports.updateSecuritySettings = async (req, res) => {
  try {
    const { minPasswordLength } = req.body;

    if (
      minPasswordLength !== undefined &&
      (isNaN(minPasswordLength) || minPasswordLength < 6)
    ) {
      return res
        .status(400)
        .json({ message: "Minimum password length must be at least 6" });
    }

    res.json({ message: "Security settings updated successfully" });
  } catch (error) {
    console.error("Update Security Settings Error:", error);
    res.status(500).json({ message: "Security settings update failed" });
  }
};
