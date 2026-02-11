const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
