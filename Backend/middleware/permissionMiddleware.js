const checkPermission = (requiredPermissions = []) => {
  return (req, res, next) => {
    try {
      // req.user is already full user from authMiddleware
      const user = req.user;

      if (!user || !user.role) {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      // 🔥 Super Admin bypass
      if (user.role.name === "Super Admin") {
        return next();
      }

      const userPermissions = user.role.permissions.map(
        (p) => p.name
      );

      // Ensure requiredPermissions is always array
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
