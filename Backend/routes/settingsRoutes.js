const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");

const settingsController = require("../controllers/settingsController");

/* ================= GET SETTINGS ================= */
router.get(
  "/",
  authMiddleware,
  settingsController.getSettings
);

/* ================= PROFILE UPDATE (ALL USERS) ================= */
router.put(
  "/profile",
  authMiddleware,
  settingsController.updateProfile
);

/* ================= EMAIL SETTINGS (SUPER ADMIN ONLY) ================= */
router.put(
  "/email",
  authMiddleware,
  checkPermission("Edit Permission"), // or create special permission
  settingsController.updateEmailSettings
);

/* ================= SECURITY SETTINGS (SUPER ADMIN ONLY) ================= */
router.put(
  "/security",
  authMiddleware,
  checkPermission("Edit Permission"), // or create special permission
  settingsController.updateSecuritySettings
);

module.exports = router;
