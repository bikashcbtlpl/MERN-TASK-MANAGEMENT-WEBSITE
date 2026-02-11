const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {

  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }
    
    // 1️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2️⃣ Check user in DB
    const user = await User.findById(decoded.userId)
      .populate({
        path: "role",
        populate: {
          path: "permissions",
        },
      });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 3️⃣ Check if user is active
    if (user.status !== "Active") {
      return res.status(403).json({ message: "User is inactive" });
    }

    // 4️⃣ Attach fresh user to request
    req.user = user;

    next();

  } catch (error) {
    console.log("VERIFY ERROR:", error.message); // 🔥 ALSO ADD THIS
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

module.exports = authMiddleware;
