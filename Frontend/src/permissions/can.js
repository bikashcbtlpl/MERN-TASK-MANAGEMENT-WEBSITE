export const PERMS = Object.freeze({
  USER_VIEW: "View User",
  USER_CREATE: "Create User",
  USER_EDIT: "Edit User",
  USER_DELETE: "Delete User",

  ROLE_VIEW: "View Role",
  ROLE_CREATE: "Create Role",
  ROLE_EDIT: "Edit Role",
  ROLE_DELETE: "Delete Role",

  PERMISSION_VIEW: "View Permission",
  PERMISSION_CREATE: "Create Permission",
  PERMISSION_EDIT: "Edit Permission",
  PERMISSION_DELETE: "Delete Permission",

  PROJECT_VIEW: "View Project",
  PROJECT_CREATE: "Create Project",
  PROJECT_EDIT: "Edit Project",
  PROJECT_DELETE: "Delete Project",

  TASK_VIEW: "View Task",
  TASK_CREATE: "Create Task",
  TASK_EDIT: "Edit Task",
  TASK_DELETE: "Delete Task",

  ISSUE_VIEW: "View Issue",
  ISSUE_CREATE: "Create Issue",
  ISSUE_EDIT: "Edit Issue",
  ISSUE_DELETE: "Delete Issue",

  DOCUMENT_VIEW: "View Document",
  DOCUMENT_CREATE: "Create Document",
  DOCUMENT_EDIT: "Edit Document",
  DOCUMENT_DELETE: "Delete Document",
});

export const PERM_GROUPS = Object.freeze({
  TASK_MANAGE: [PERMS.TASK_CREATE, PERMS.TASK_EDIT, PERMS.TASK_DELETE],
  ROLE_MANAGE: [PERMS.ROLE_VIEW, PERMS.ROLE_CREATE, PERMS.ROLE_EDIT, PERMS.ROLE_DELETE],
  PERMISSION_MANAGE: [
    PERMS.PERMISSION_VIEW,
    PERMS.PERMISSION_CREATE,
    PERMS.PERMISSION_EDIT,
    PERMS.PERMISSION_DELETE,
  ],
  USER_MANAGE: [PERMS.USER_VIEW, PERMS.USER_CREATE, PERMS.USER_EDIT, PERMS.USER_DELETE],
  PROJECT_MANAGE: [
    PERMS.PROJECT_VIEW,
    PERMS.PROJECT_CREATE,
    PERMS.PROJECT_EDIT,
    PERMS.PROJECT_DELETE,
  ],
  DOCUMENT_MANAGE: [
    PERMS.DOCUMENT_VIEW,
    PERMS.DOCUMENT_CREATE,
    PERMS.DOCUMENT_EDIT,
    PERMS.DOCUMENT_DELETE,
  ],
});

export const getPermissionNames = (user) => {
  const rolePerms = user?.role?.permissions;
  if (Array.isArray(rolePerms) && rolePerms.length > 0) {
    return rolePerms.map((p) => (typeof p === "string" ? p : p?.name || ""));
  }

  const flatPerms = user?.permissions;
  if (Array.isArray(flatPerms)) return flatPerms;

  return [];
};

export const isSuperAdmin = (user) =>
  user?.role?.name === "Super Admin" || user?.role === "Super Admin";

export const isAdminUser = (user) => {
  const roleName = user?.role?.name || user?.role || "";
  return roleName === "Super Admin" || roleName === "Admin";
};

export const can = (user, permissionName) =>
  isSuperAdmin(user) || getPermissionNames(user).includes(permissionName);

export const canAny = (user, permissionList = []) =>
  isSuperAdmin(user) ||
  permissionList.some((perm) => getPermissionNames(user).includes(perm));

export const canAll = (user, permissionList = []) =>
  isSuperAdmin(user) ||
  permissionList.every((perm) => getPermissionNames(user).includes(perm));
