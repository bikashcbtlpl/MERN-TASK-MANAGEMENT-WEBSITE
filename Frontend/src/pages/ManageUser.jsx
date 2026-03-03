import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import {
  PageHeader,
  Modal,
  FormField,
  StatusBadge,
  ActionButtons,
} from "../components/common";
import usePermissions from "../hooks/usePermissions";

function ManageUser() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    status: "Active",
  });

  const { canCreate, canEdit, canDelete } = usePermissions("User");
  const loggedInUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    const res = await axiosInstance.get("/users");
    if (loggedInUser?.role !== "Super Admin") {
      setUsers(res.data.filter((u) => u.role?.name !== "Super Admin"));
    } else {
      setUsers(res.data);
    }
  };

  const fetchRoles = async () => {
    const res = await axiosInstance.get("/roles");
    if (loggedInUser?.role !== "Super Admin") {
      setRoles(res.data.filter((role) => role.name !== "Super Admin"));
    } else {
      setRoles(res.data);
    }
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    setEditingUser(null);
    setFormData({ name: "", email: "", role: "", status: "Active" });
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    if (!canEdit) return;
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email,
      role: user.role?._id || "",
      status: user.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingUser && !canEdit) return;
    if (!editingUser && !canCreate) return;

    if (editingUser) {
      await axiosInstance.put(`/users/${editingUser._id}`, formData);
    } else {
      await axiosInstance.post("/users", formData);
    }

    fetchUsers();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    await axiosInstance.delete(`/users/${id}`);
    fetchUsers();
  };

  const isSuperAdminRow = (user) =>
    user.role?.name === "Super Admin" &&
    loggedInUser?.role !== "Super Admin";

  return (
    <div className="manage-role-container">
      <PageHeader
        title="Manage Users"
        btnLabel={canCreate ? "+ Add User" : undefined}
        onBtnClick={openCreateModal}
      />

      <p>
        Total Users: <strong>{users.length}</strong>
      </p>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            {(canEdit || canDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user._id}>
              <td>{index + 1}</td>
              <td>{user.name || "-"}</td>
              <td>{user.email}</td>
              <td>{user.role?.name}</td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              {(canEdit || canDelete) && (
                <ActionButtons
                  canEdit={canEdit && !isSuperAdminRow(user)}
                  canDelete={canDelete && !isSuperAdminRow(user)}
                  onEdit={() => openEditModal(user)}
                  onDelete={() => handleDelete(user._id)}
                />
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? "Edit User" : "Add User"}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Name">
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter name (optional)"
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={!!editingUser}
            />
          </FormField>

          <FormField label="Role">
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
          </FormField>

          <FormField label="Status">
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </FormField>

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
      </Modal>
    </div>
  );
}

export default ManageUser;
