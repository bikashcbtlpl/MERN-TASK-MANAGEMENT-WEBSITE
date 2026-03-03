/**
 * Middleware: Allow only Super Admin role.
 * Requires authMiddleware to run first (req.user is the full user with populated role).
 */
const superAdminOnly = (req, res, next) => {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(403).json({ message: "Access Denied" });
    }

    if (user.role.name !== "Super Admin") {
      return res.status(403).json({ message: "Super Admin access required" });
    }

    next();
  } catch (err) {
    console.error("superAdminOnly middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = superAdminOnly;
