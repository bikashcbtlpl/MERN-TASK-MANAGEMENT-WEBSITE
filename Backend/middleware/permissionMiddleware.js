const User = require("../models/User");

const checkPermission = (requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId)
        .populate({
          path: "role",
          populate: {
            path: "permissions",
          },
        });

      if (!user || !user.role) {
        return res.status(403).json({ message: "Access Denied" });
      }

      // 🔥 Super Admin Bypass (Optional but recommended)
      if (user.role.name === "Super Admin") {
        return next();
      }

      const userPermissions = user.role.permissions.map(
        (p) => p.name
      );

      // If requiredPermissions is a single string → convert to array
      if (!Array.isArray(requiredPermissions)) {
        requiredPermissions = [requiredPermissions];
      }

      const hasAccess = requiredPermissions.some((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasAccess) {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      next();
    } catch (error) {
      console.error("Permission Middleware Error:", error);
      res.status(500).json({
        message: "Permission Check Failed",
      });
    }
  };
};

module.exports = checkPermission;
