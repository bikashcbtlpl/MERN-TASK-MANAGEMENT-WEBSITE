const User = require("../models/User");

const superAdminOnly = async (req, res, next) => {
  const user = await User.findById(req.user.userId).populate("role");

  if (user.role.name !== "Super Admin") {
    return res.status(403).json({ message: "Super Admin Only" });
  }

  next();
};

module.exports = superAdminOnly;
