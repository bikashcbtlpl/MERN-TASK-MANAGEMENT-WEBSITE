import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

function ManagePermission() {
  const [permissions, setPermissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    status: "Active",
  });

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const res = await axiosInstance.get("/permissions");
    setPermissions(res.data);
  };

  const openCreateModal = () => {
    setEditingPermission(null);
    setFormData({ name: "", status: "Active" });
    setIsModalOpen(true);
  };

  const openEditModal = (permission) => {
    setEditingPermission(permission);
    setFormData(permission);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingPermission) {
      await axiosInstance.put(
        `/permissions/${editingPermission._id}`,
        formData
      );
    } else {
      await axiosInstance.post("/permissions", formData);
    }

    fetchPermissions();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    await axiosInstance.delete(`/permissions/${id}`);
    fetchPermissions();
  };

  return (
    <div className="manage-role-container">
      <div className="manage-role-header">
        <h2>Manage Permission</h2>
        <button className="create-role-btn" onClick={openCreateModal}>
          + Create Permission
        </button>
      </div>

      <p>Total Permissions: <strong>{permissions.length}</strong></p>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {permissions.map((p, index) => (
            <tr key={p._id}>
              <td>{index + 1}</td>
              <td>{p.name}</td>
              <td>
                <span
                  className={
                    p.status === "Active"
                      ? "role-status active"
                      : "role-status inactive"
                  }
                >
                  {p.status}
                </span>
              </td>
              <td>
                <button
                  className="edit-role-btn"
                  onClick={() => openEditModal(p)}
                >
                  Edit
                </button>

                <button
                  className="delete-role-btn"
                  onClick={() => handleDelete(p._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {editingPermission ? "Edit Permission" : "Create Permission"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="modal-buttons">
                <button type="submit" className="save-btn">
                  {editingPermission ? "Update" : "Create"}
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

export default ManagePermission;
