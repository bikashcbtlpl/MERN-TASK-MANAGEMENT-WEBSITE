const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // 🔥 Check cookies exist
    if (!req.cookies || !req.cookies.token) {
      return res.status(401).json({
        message: "Unauthorized - No token",
      });
    }

    const token = req.cookies.token;

    // 🔐 Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 👤 Fetch user with role + permissions
    const user = await User.findById(decoded.userId).populate({
      path: "role",
      populate: {
        path: "permissions",
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        message: "User is inactive",
      });
    }

    // ✅ Attach full user object
    req.user = user;

    next();
  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Unauthorized - Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
