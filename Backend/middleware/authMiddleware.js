const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    // Check cookies exist
    if (!req.cookies || !req.cookies.token) {
      return res.status(401).json({
        message: "Unauthorized - No token provided",
      });
    }

    const token = req.cookies.token;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Session expired, please login again" });
      }
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    if (!decoded?.userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized - Malformed token" });
    }

    // Fetch user with role + permissions
    const user = await User.findById(decoded.userId)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
        },
      })
      .lean();

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized - User not found",
      });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        message: "Your account is inactive. Please contact an administrator.",
      });
    }

    // Attach full user object to request
    req.user = user;

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);
    return res.status(401).json({
      message: "Unauthorized - Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
