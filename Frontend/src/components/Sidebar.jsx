import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

function Sidebar() {
  const { user } = useContext(AuthContext);
  const permissions = user?.permissions || [];

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
      <div className="sidebar-logo">LOGO</div>

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
