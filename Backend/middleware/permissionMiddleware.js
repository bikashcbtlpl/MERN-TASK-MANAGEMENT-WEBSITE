/**
 * Permission Middleware
 * Usage: checkPermission(["Create Task", "Edit Task"])
 * Passes if the user has ANY of the given permissions, or is Super Admin.
 */
const checkPermission = (requiredPermissions = []) => {
  // Normalise to array once at middleware creation time
  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.role) {
        return res.status(403).json({
          message: "Access Denied - No role assigned",
        });
      }

      // Super Admin bypass — full access
      if (user.role.name === "Super Admin") {
        return next();
      }

      // Inactive role check
      if (user.role.status === "Inactive") {
        return res.status(403).json({
          message: "Access Denied - Your role is inactive",
        });
      }

      const userPermissions = (user.role.permissions || [])
        .filter((p) => p && p.status !== "Inactive")
        .map((p) => p.name);

      const hasAccess = permissions.some((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasAccess) {
        return res.status(403).json({
          message: "Access Denied - Insufficient permissions",
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
