import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

function ManageUser() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    role: "",
    status: "Active",
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    const res = await axiosInstance.get("/users");
    setUsers(res.data);
  };

  const fetchRoles = async () => {
    const res = await axiosInstance.get("/roles");
    setRoles(res.data);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      email: "",
      role: "",
      status: "Active",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      role: user.role?._id || "",
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingUser) {
      await axiosInstance.put(`/users/${editingUser._id}`, formData);
    } else {
      await axiosInstance.post("/users", formData);
    }

    fetchUsers();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    await axiosInstance.delete(`/users/${id}`);
    fetchUsers();
  };

  return (
    <div className="manage-role-container">
      <div className="manage-role-header">
        <h2>Manage User</h2>
        <button className="create-role-btn" onClick={openCreateModal}>
          + Add User
        </button>
      </div>

      <p>
        Total Users: <strong>{users.length}</strong>
      </p>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((user, index) => (
            <tr key={user._id}>
              <td>{index + 1}</td>
              <td>{user.email}</td>
              <td>{user.role?.name}</td>
              <td>
                <span
                  className={
                    user.status === "Active"
                      ? "role-status active"
                      : "role-status inactive"
                  }
                >
                  {user.status}
                </span>
              </td>
              <td>
                <button
                  className="edit-role-btn"
                  onClick={() => openEditModal(user)}
                >
                  Edit
                </button>

                <button
                  className="delete-role-btn"
                  onClick={() => handleDelete(user._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingUser ? "Edit User" : "Add User"}</h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  disabled={editingUser} // prevent editing email
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
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
                  {editingUser ? "Update" : "Add"}
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

export default ManageUser;
