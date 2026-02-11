import { NavLink } from "react-router-dom";

function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const permissions = user?.permissions || [];

  const hasPermission = (permissionList) => {
    return permissionList.some((perm) =>
      permissions.includes(perm)
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">LOGO</div>

      <div className="sidebar-nav">

        {/* Always Visible */}
        <NavLink to="/dashboard">Dashboard</NavLink>

        {/* TASK */}
        {hasPermission([
          "View Task",
          "Create Task",
          "Edit Task",
          "Delete Task",
        ]) && (
          <NavLink to="/tasks">Manage Task</NavLink>
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

        {/* Optional */}
        <NavLink to="/settings">Settings</NavLink>

      </div>
    </div>
  );
}

export default Sidebar;
