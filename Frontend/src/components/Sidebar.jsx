import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PERMS, PERM_GROUPS, canAny } from "../permissions/can";

function Sidebar() {
  const { user, loading } = useAuth();
  if (loading) return null;

  const canManageTask = canAny(user, PERM_GROUPS.TASK_MANAGE);
  const canViewTask = canAny(user, [PERMS.TASK_VIEW]);

  return (
    <div className="sidebar">
      <div className="sidebar-logo">TASK MANAGEMENT</div>

      <div className="sidebar-nav">
        {/* Always Visible */}
        <NavLink to="/dashboard">Dashboard</NavLink>

        {/* PROJECT SECTION - visible only to users with project permissions */}
        {canAny(user, PERM_GROUPS.PROJECT_MANAGE) && (
          <NavLink to="/projects">Manage Projects</NavLink>
        )}

        {/* DOCUMENTS - visible to all authenticated users; access controlled on page */}
        <NavLink to="/documents">Documents</NavLink>

        {/* TASK SECTION */}

        {/* If user can manage tasks */}
        {canManageTask && <NavLink to="/tasks">Manage Task</NavLink>}

        {/* If user only has view permission, show My Task (not Manage Task) */}
        {!canManageTask && canViewTask && (
          <NavLink to="/my-tasks">My Task</NavLink>
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
