/**
 * Central permission catalog.
 * Add new default permissions here once, then restart server.
 * Startup sync will create missing permissions automatically.
 */
const PERMISSION_CATALOG = {
  user: ["View User", "Create User", "Edit User", "Delete User"],
  role: ["View Role", "Create Role", "Edit Role", "Delete Role"],
  permission: [
    "View Permission",
    "Create Permission",
    "Edit Permission",
    "Delete Permission",
  ],
  project: ["View Project", "Create Project", "Edit Project", "Delete Project"],
  task: ["View Task", "Create Task", "Edit Task", "Delete Task"],
  issue: ["View Issue", "Create Issue", "Edit Issue", "Delete Issue"],
};

const getDefaultPermissions = () => {
  const all = Object.values(PERMISSION_CATALOG).flat();
  return Array.from(new Set(all));
};

module.exports = {
  PERMISSION_CATALOG,
  getDefaultPermissions,
};
