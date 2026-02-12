import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


function Sidebar() {
  const { user,loading } = useAuth();
  const permissions = user?.permissions || [];
  if (loading) return null;


  const hasPermission = (permissionList) => {
    return permissionList.some((perm) =>
      permissions.includes(perm)
    );
  };

  const canManageTask = hasPermission([
    "Create Task",
    "Edit Task",
    "Delete Task",
  ]);

  const canViewTask = permissions.includes("View Task");

  return (
    <div className="sidebar">
      <div className="sidebar-logo">TASK MANAGEMENT</div>

      <div className="sidebar-nav">

        {/* Always Visible */}
        <NavLink to="/dashboard">Dashboard</NavLink>

        {/* TASK SECTION */}

        {/* If user can manage tasks */}
        {canManageTask && (
          <NavLink to="/tasks">Manage Task</NavLink>
        )}

        {/* If user only has view permission */}
        {!canManageTask && canViewTask && (
          <NavLink to="/my-tasks">My Task</NavLink>
        )}

        {/* ROLE */}
        {hasPermission([
          "View Role",
          "Create Role",
          "Edit Role",
          "Delete Role",
        ]) && (
          <NavLink to="/roles">Manage Role</NavLink>
        )}

        {/* PERMISSION */}
        {hasPermission([
          "View Permission",
          "Create Permission",
          "Edit Permission",
          "Delete Permission",
        ]) && (
          <NavLink to="/permissions">Manage Permission</NavLink>
        )}

        {/* USER */}
        {hasPermission([
          "View User",
          "Create User",
          "Edit User",
          "Delete User",
        ]) && (
          <NavLink to="/users">Manage User</NavLink>
        )}

        <NavLink to="/settings">Settings</NavLink>

      </div>
    </div>
  );
}

export default Sidebar;
