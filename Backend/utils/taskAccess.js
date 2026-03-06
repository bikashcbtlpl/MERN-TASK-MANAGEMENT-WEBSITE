const Project = require("../models/Project");

/**
 * Returns true when the user can access a task based on current scoping rules:
 * - Super Admin can access all tasks
 * - Project team member can access
 */
const canAccessTask = async (user, task) => {
  if (!user || !task) return false;

  if (user.role?.name === "Super Admin") return true;

  const taskProject = task.project?._id || task.project;
  if (!taskProject) return false;

  const isTeamMember = await Project.exists({
    _id: taskProject,
    team: user._id,
  });

  return Boolean(isTeamMember);
};

module.exports = { canAccessTask };
