import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PERMS, PERM_GROUPS, canAny } from "../permissions/can";

function Sidebar() {
  const { user, loading } = useAuth();
  if (loading) return null;

  const canManageTask = canAny(user, PERM_GROUPS.TASK_MANAGE);
  const canViewTask = canAny(user, [PERMS.TASK_VIEW]);
  const canViewIssues = canAny(user, [PERMS.ISSUE_VIEW, PERMS.ISSUE_CREATE, PERMS.ISSUE_EDIT]);

  return (
    <div className="sidebar">
      <div className="sidebar-logo">TASK MANAGEMENT</div>

      <div className="sidebar-nav">
        {/* Always Visible */}
        <NavLink to="/dashboard">Dashboard</NavLink>

        {/* PROJECT SECTION */}
        {canAny(user, PERM_GROUPS.PROJECT_MANAGE) && (
          <NavLink to="/projects">Manage Projects</NavLink>
        )}

        {/* DOCUMENTS */}
        <NavLink to="/documents">Documents</NavLink>

        {/* TASK SECTION */}
        {canManageTask && <NavLink to="/tasks">Manage Task</NavLink>}
        {!canManageTask && canViewTask && (
          <NavLink to="/my-tasks">My Task</NavLink>
        )}

        {/* ISSUES */}
        {(canViewIssues || canViewTask) && (
          <NavLink to="/issues">Manage Issues</NavLink>
        )}

        {/* ROLE */}
        {canAny(user, PERM_GROUPS.ROLE_MANAGE) && (
          <NavLink to="/roles">Manage Role</NavLink>
        )}

        {/* PERMISSION */}
        {canAny(user, PERM_GROUPS.PERMISSION_MANAGE) && (
          <NavLink to="/permissions">Manage Permission</NavLink>
        )}

        {/* USER */}
        {canAny(user, PERM_GROUPS.USER_MANAGE) && (
          <NavLink to="/users">Manage User</NavLink>
        )}

        <NavLink to="/settings">Settings</NavLink>
      </div>
    </div>
  );
}

export default Sidebar;
