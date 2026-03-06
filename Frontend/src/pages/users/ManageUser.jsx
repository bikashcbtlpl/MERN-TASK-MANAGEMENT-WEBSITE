import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import {
  PageHeader,
  Modal,
  FormField,
  StatusBadge,
  ActionButtons,
  Button,
  Input,
} from "../../components/common";
import usePermissions from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import { isSuperAdmin } from "../../permissions/can";

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
  const { user } = useAuth();

  const { canCreate, canEdit, canDelete } = usePermissions("User");
  const isCurrentSuperAdmin = isSuperAdmin(user);

  const fetchUsers = useCallback(async () => {
    const res = await axiosInstance.get("/users");
    if (!isCurrentSuperAdmin) {
      setUsers(res.data.filter((u) => u.role?.name !== "Super Admin"));
    } else {
      setUsers(res.data);
    }
  }, [isCurrentSuperAdmin]);

  const fetchRoles = useCallback(async () => {
    const res = await axiosInstance.get("/roles");
    if (!isCurrentSuperAdmin) {
      setRoles(res.data.filter((role) => role.name !== "Super Admin"));
    } else {
      setRoles(res.data);
    }
  }, [isCurrentSuperAdmin]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

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
    user.role?.name === "Super Admin" && !isCurrentSuperAdmin;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="manage-role-container">
      <PageHeader
        title="Manage Users"
        btnLabel={canCreate ? "+ Add User" : undefined}
        onBtnClick={openCreateModal}
      >
        <div className="header-search-wrapper">
          <span className="search-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="header-search"
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </PageHeader>

      <p>
        Total Users: <strong>{filteredUsers.length}</strong>
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
          {filteredUsers.map((user, index) => (
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
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter name (optional)"
            />
          </FormField>

          <FormField label="Email">
            <Input
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
            <Input
              as="select"
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
            </Input>
          </FormField>

          <FormField label="Status">
            <Input
              as="select"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Input>
          </FormField>

          <div className="modal-buttons">
            <Button variant="primary" type="submit">
              {editingUser ? "Update" : "Add"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ManageUser;
