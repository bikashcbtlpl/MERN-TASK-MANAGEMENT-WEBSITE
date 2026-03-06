import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import {
  PageHeader,
  StatusBadge,
  ActionButtons,
} from "../../components/common";
import usePermissions from "../../hooks/usePermissions";
import { useAuth } from "../../context/AuthContext";
import { isSuperAdmin } from "../../permissions/can";

function ManageRole() {
  const [roles, setRoles] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { canCreate, canEdit, canDelete } = usePermissions("Role");
  const isCurrentSuperAdmin = isSuperAdmin(user);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/roles");
      if (!isCurrentSuperAdmin) {
        setRoles(response.data.filter((r) => r.name !== "Super Admin"));
      } else {
        setRoles(response.data);
      }
    } catch (error) {
      console.log("Error fetching roles", error);
    }
  }, [isCurrentSuperAdmin]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (id) => {
    if (!canDelete) return;
    try {
      await axiosInstance.delete(`/roles/${id}`);
      fetchRoles();
    } catch (error) {
      console.log("Error deleting role", error);
    }
  };

  const isSuperAdminRow = (role) =>
    role.name === "Super Admin" && !isCurrentSuperAdmin;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredRoles = roles.filter((role) =>
    role.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="manage-role-container">
      <PageHeader
        title="Manage Roles"
        btnLabel={canCreate ? "+ Create Role" : undefined}
        onBtnClick={() => navigate("/roles/create")}
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
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </PageHeader>

      <p>
        Total Roles: <strong>{filteredRoles.length}</strong>
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
          {filteredRoles.map((role, index) => (
            <tr key={role._id}>
              <td>{index + 1}</td>
              <td>{role.name}</td>
              <td>
                <StatusBadge status={role.status} />
              </td>
              <td>{role.permissions?.map((p) => p.name).join(", ")}</td>
              {(canEdit || canDelete) && (
                <ActionButtons
                  canEdit={canEdit && !isSuperAdminRow(role)}
                  canDelete={canDelete && !isSuperAdminRow(role)}
                  onEdit={() => navigate(`/roles/edit/${role.name}`)}
                  onDelete={() => handleDelete(role._id)}
                />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManageRole;
