const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// POST /api/auth/login
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);
router.get("/verify", authMiddleware, (req, res) => {
  res.json({ message: "Token valid" });
});


module.exports = router;
