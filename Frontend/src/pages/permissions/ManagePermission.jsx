import { useState, useEffect } from "react";
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

function ManagePermission() {
  const [permissions, setPermissions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState(null);
  const [formData, setFormData] = useState({ name: "", status: "Active" });

  const { canCreate, canEdit, canDelete } = usePermissions("Permission");

  const fetchPermissions = async () => {
    const res = await axiosInstance.get("/permissions");
    setPermissions(res.data);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

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

  const [searchQuery, setSearchQuery] = useState("");

  const filteredPermissions = permissions.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="manage-role-container">
      <PageHeader
        title="Manage Permissions"
        btnLabel={canCreate ? "+ Create Permission" : undefined}
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
            placeholder="Search permissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </PageHeader>

      <p>
        Total Permissions: <strong>{filteredPermissions.length}</strong>
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
          {filteredPermissions.map((p, index) => (
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
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
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
              {editingPermission ? "Update" : "Create"}
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

export default ManagePermission;
