const Task = require("../models/Task");
const Project = require("../models/Project");

/**
 * Middleware that allows proceeding if the user has 'Edit Task' permission
 * OR is a member of the task's project team.
 * Super Admin also bypasses this check.
 */
module.exports = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // Super Admin has full access
    if (user.role && user.role.name === "Super Admin") {
      return next();
    }

    const perms = (user.role && user.role.permissions) || [];
    const permNames = perms
      .filter((p) => p && p.status !== "Inactive")
      .map((p) => (typeof p === "string" ? p : p.name));

    if (permNames.includes("Edit Task")) return next();

    // No Edit permission: allow only if user is in the task project team
    const taskId = req.params.id;
    if (!taskId) return res.status(400).json({ message: "Task id required" });

    const task = await Task.findById(taskId).select("project").lean();
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.project) {
      return res
        .status(403)
        .json({ message: "Access Denied - Task has no project team" });
    }

    const isTeamMember = await Project.exists({
      _id: task.project,
      team: user._id,
    });

    if (isTeamMember) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Access Denied - You cannot edit this task" });
  } catch (err) {
    console.error("canEditTask middleware error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
