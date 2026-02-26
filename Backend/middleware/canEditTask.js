const Task = require("../models/Task");

/**
 * Middleware that allows proceeding if the user has 'Edit Task' permission
 * OR is the assigned user for the task being updated.
 */
module.exports = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const perms = (user.role && user.role.permissions) || [];
    const permNames = perms.map((p) => (typeof p === 'string' ? p : p.name));

    if (permNames.includes("Edit Task")) return next();

    // No Edit permission: allow only if user is assigned to the task
    const taskId = req.params.id;
    if (!taskId) return res.status(400).json({ message: "Task id required" });

    const task = await Task.findById(taskId).select("assignedTo");
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.assignedTo && String(task.assignedTo) === String(user._id)) return next();

    return res.status(403).json({ message: "Access Denied" });
  } catch (err) {
    console.error("canEditTask middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
