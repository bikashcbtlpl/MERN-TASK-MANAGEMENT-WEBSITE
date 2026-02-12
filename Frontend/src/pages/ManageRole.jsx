import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function ManageRole() {
  const [roles, setRoles] = useState([]);
  const navigate = useNavigate();

  // 🔥 RBAC
  const loggedUser = JSON.parse(localStorage.getItem("user"));
  const userPermissions = loggedUser?.permissions || [];

  const canCreate = userPermissions.includes("Create Role");
  const canEdit = userPermissions.includes("Edit Role");
  const canDelete = userPermissions.includes("Delete Role");

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get("/roles");

      const loggedInUser = JSON.parse(localStorage.getItem("user"));

      // If NOT Super Admin → hide Super Admin role
      if (loggedInUser?.role !== "Super Admin") {
        const filteredRoles = response.data.filter(
          (role) => role.name !== "Super Admin"
        );
        setRoles(filteredRoles);
      } else {
        setRoles(response.data);
      }

    } catch (error) {
      console.log("Error fetching roles", error);
    }
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;

    try {
      await axiosInstance.delete(`/roles/${id}`);
      fetchRoles();
    } catch (error) {
      console.log("Error deleting role", error);
    }
  };

  return (
    <div className="manage-role-container">
      <div className="manage-role-header">
        <h2>Manage Role</h2>

        {canCreate && (
          <button
            className="create-role-btn"
            onClick={() => navigate("/roles/create")}
          >
            + Create Role
          </button>
        )}
      </div>

      <p>
        Total Roles: <strong>{roles.length}</strong>
      </p>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Role Name</th>
            <th>Status</th>
            <th>Permissions</th>
            {(canEdit || canDelete) && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {roles.map((role, index) => (
            <tr key={role._id}>
              <td>{index + 1}</td>

              <td>{role.name}</td>

              <td>
                <span
                  className={
                    role.status === "Active"
                      ? "role-status active"
                      : "role-status inactive"
                  }
                >
                  {role.status}
                </span>
              </td>

              <td>
                {role.permissions?.map((p) => p.name).join(", ")}
              </td>

              {(canEdit || canDelete) && (
                <td>
                  {!(role.name === "Super Admin" && 
                    JSON.parse(localStorage.getItem("user"))?.role !== "Super Admin") && (
                    <>
                      <button
                        className="edit-role-btn"
                        onClick={() =>
                          navigate(`/roles/edit/${role.name}`)
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="delete-role-btn"
                        onClick={() =>
                          handleDelete(role._id)
                        }
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageRole;
