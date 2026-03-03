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

function ManagePermission() {
  const [permissions, setPermissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({ name: "", status: "Active" });

  const { canCreate, canEdit, canDelete } = usePermissions("Permission");

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const res = await axiosInstance.get("/permissions");
    setPermissions(res.data);
  };

  const openCreateModal = () => {
    if (!canCreate) return;
    setEditingPermission(null);
    setFormData({ name: "", status: "Active" });
    setIsModalOpen(true);
  };

  const openEditModal = (permission) => {
    if (!canEdit) return;
    setEditingPermission(permission);
    setFormData({ name: permission.name, status: permission.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingPermission && !canEdit) return;
    if (!editingPermission && !canCreate) return;

    if (editingPermission) {
      await axiosInstance.put(
        `/permissions/${editingPermission._id}`,
        formData,
      );
    } else {
      await axiosInstance.post("/permissions", formData);
    }

    fetchPermissions();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (!canDelete) return;
    await axiosInstance.delete(`/permissions/${id}`);
    fetchPermissions();
  };

  return (
    <div className="manage-role-container">
      <PageHeader
        title="Manage Permissions"
        btnLabel={canCreate ? "+ Create Permission" : undefined}
        onBtnClick={openCreateModal}
      />

      <p>
        Total Permissions: <strong>{permissions.length}</strong>
      </p>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Status</th>
            {(canEdit || canDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p, index) => (
            <tr key={p._id}>
              <td>{index + 1}</td>
              <td>{p.name}</td>
              <td>
                <StatusBadge status={p.status} />
              </td>
              {(canEdit || canDelete) && (
                <ActionButtons
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={() => openEditModal(p)}
                  onDelete={() => handleDelete(p._id)}
                />
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPermission ? "Edit Permission" : "Create Permission"}
      >
        <form onSubmit={handleSubmit}>
          <FormField label="Name">
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
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
      </Modal>
    </div>
  );
}

export default ManagePermission;
