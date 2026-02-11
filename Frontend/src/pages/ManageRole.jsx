import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

function ManageRole() {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    status: "Active",
    permissions: [],
  });

  // ================= FETCH DATA =================

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get("/roles");
      setRoles(response.data);
    } catch (error) {
      console.log("Error fetching roles", error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axiosInstance.get("/permissions");
      setAllPermissions(response.data);
    } catch (error) {
      console.log("Error fetching permissions", error);
    }
  };

  // ================= MODAL =================

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      status: "Active",
      permissions: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);

    setFormData({
      name: role.name,
      status: role.status,
      permissions: role.permissions.map((p) => p._id),
    });

    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePermissionChange = (permissionId) => {
    if (formData.permissions.includes(permissionId)) {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter(
          (p) => p !== permissionId
        ),
      });
    } else {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permissionId],
      });
    }
  };

  // ================= SUBMIT =================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingRole) {
        await axiosInstance.put(
          `/roles/${editingRole._id}`,
          formData
        );
      } else {
        await axiosInstance.post("/roles", formData);
      }

      fetchRoles();
      setIsModalOpen(false);
    } catch (error) {
      console.log("Error saving role", error);
    }
  };

  // ================= DELETE =================

  const handleDelete = async (id) => {
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
        <button className="create-role-btn" onClick={openCreateModal}>
          + Create Role
        </button>
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
            <th>Actions</th>
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
                {role.permissions
                  .map((p) => p.name)
                  .join(", ")}
              </td>

              <td>
                <button
                  className="edit-role-btn"
                  onClick={() => openEditModal(role)}
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= MODAL ================= */}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {editingRole ? "Edit Role" : "Create Role"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Role Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Permissions</label>

                <div className="permission-checkboxes">
                  {allPermissions.map((permission) => (
                    <label
                      key={permission._id}
                      className="checkbox-item"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(
                          permission._id
                        )}
                        onChange={() =>
                          handlePermissionChange(
                            permission._id
                          )
                        }
                      />
                      {permission.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-buttons">
                <button
                  type="submit"
                  className="save-btn"
                >
                  {editingRole ? "Update" : "Create"}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageRole;
