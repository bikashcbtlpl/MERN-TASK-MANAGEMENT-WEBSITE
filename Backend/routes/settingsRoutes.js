const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const superAdminOnly = require("../middleware/superAdminOnly");
const settingsController = require("../controllers/settingsController");

/* ================= GET SETTINGS ================= */
router.get("/", authMiddleware, settingsController.getSettings);

/* ================= PROFILE UPDATE (ALL AUTHENTICATED USERS) ================= */
router.put("/profile", authMiddleware, settingsController.updateProfile);

/* ================= EMAIL SETTINGS (SUPER ADMIN ONLY) ================= */
router.put(
  "/email",
  authMiddleware,
  superAdminOnly,
  settingsController.updateEmailSettings,
);

/* ================= SECURITY SETTINGS (SUPER ADMIN ONLY) ================= */
router.put(
  "/security",
  authMiddleware,
  superAdminOnly,
  settingsController.updateSecuritySettings,
);

module.exports = router;
