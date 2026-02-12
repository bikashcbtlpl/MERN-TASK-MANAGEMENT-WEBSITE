import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function RoleForm() {
  const navigate = useNavigate();
  const { roleName } = useParams();
  const location = useLocation();

  const isEdit = location.pathname.includes("/edit/");

  const [roleId, setRoleId] = useState(null); // ⭐ IMPORTANT

  const [formData, setFormData] = useState({
    name: "",
    status: "Active",
    permissions: [],
  });

  const [modules, setModules] = useState({});
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const init = async () => {
      await fetchPermissions();

      if (isEdit) {
        await fetchRole();
      }

      setLoading(false);
    };

    init();
  }, [roleName]);

  /* ================= FETCH PERMISSIONS ================= */

  const fetchPermissions = async () => {
    const res = await axiosInstance.get("/permissions");

    const grouped = {};

    res.data.forEach((perm) => {
      const [action, module] = perm.name.split(" ");

      if (!grouped[module]) {
        grouped[module] = [];
      }

      grouped[module].push(perm);
    });

    setModules(grouped);
  };

  /* ================= FETCH ROLE ================= */

  const fetchRole = async () => {
    const res = await axiosInstance.get("/roles");

    const role = res.data.find(
      (r) => r.name === decodeURIComponent(roleName)
    );

    if (!role) return;

    setRoleId(role._id); // ⭐ STORE ID

    setFormData({
      name: role.name,
      status: role.status,
      permissions: role.permissions.map((p) => p._id),
    });
  };

  /* ================= PERMISSION LOGIC ================= */

  const togglePermission = (permId) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permId);

      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      };
    });
  };

  const toggleAllForModule = (modulePerms) => {
    const moduleIds = modulePerms.map((p) => p._id);

    const allSelected = moduleIds.every((id) =>
      formData.permissions.includes(id)
    );

    if (allSelected) {
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter(
          (id) => !moduleIds.includes(id)
        ),
      }));
    } else {
      const newPerms = [
        ...new Set([...formData.permissions, ...moduleIds]),
      ];

      setFormData((prev) => ({
        ...prev,
        permissions: newPerms,
      }));
    }
  };

  const isModuleAllSelected = (modulePerms) => {
    const moduleIds = modulePerms.map((p) => p._id);

    return moduleIds.every((id) =>
      formData.permissions.includes(id)
    );
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        if (!roleId) return;

        await axiosInstance.put(
          `/roles/${roleId}`, // ✅ FIXED
          formData
        );
      } else {
        await axiosInstance.post("/roles", formData);
      }

      navigate("/roles");
    } catch (error) {
      console.log("Error saving role", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  /* ================= UI ================= */

  return (
    <div className="role-form-container">
      <div className="role-form-card">
        <h2>
          {isEdit ? `Edit Role` : "Create Role"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Role Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value,
                })
              }
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* ================= MATRIX ================= */}

          <div className="permission-matrix">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>All</th>
                  <th>Create</th>
                  <th>View</th>
                  <th>Edit</th>
                  <th>Delete</th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(modules).map(
                  ([moduleName, modulePerms]) => (
                    <tr key={moduleName}>
                      <td>{moduleName}</td>

                      {/* ALL */}
                      <td>
                        <input
                          type="checkbox"
                          checked={isModuleAllSelected(
                            modulePerms
                          )}
                          onChange={() =>
                            toggleAllForModule(
                              modulePerms
                            )
                          }
                        />
                      </td>

                      {["Create", "View", "Edit", "Delete"].map(
                        (action) => {
                          const perm =
                            modulePerms.find(
                              (p) =>
                                p.name ===
                                `${action} ${moduleName}`
                            );

                          return (
                            <td key={action}>
                              {perm && (
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(
                                    perm._id
                                  )}
                                  onChange={() =>
                                    togglePermission(
                                      perm._id
                                    )
                                  }
                                />
                              )}
                            </td>
                          );
                        }
                      )}
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-btn">
              {isEdit
                ? "Update Role"
                : "Create Role"}
            </button>

            <button
              type="button"
              className="cancel-btn"
              onClick={() =>
                navigate("/roles")
              }
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RoleForm;
