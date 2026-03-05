import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  Pagination,
  ActionButtons,
  LoadingSpinner,
  StatusBadge,
} from "../components/common";
import usePermissions from "../hooks/usePermissions";
import { useAuth } from "../context/AuthContext";

const ManageProject = () => {
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { loading: authLoading, setUser } = useAuth();

  const { canCreate, canEdit, canDelete } = usePermissions("Project");

  const fetchProjects = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (query) params.search = query;
      const res = await axiosInstance.get("/projects", { params });
      const data = res.data;
      if (data.projects) {
        setProjects(data.projects);
        setTotalProjects(data.totalProjects || 0);
        setCurrentPage(data.currentPage || page);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        setProjects(data);
        setTotalProjects(data.length);
        setCurrentPage(1);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchProjects(1);
  }, [authLoading]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "user") {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          if (newUser) setUser(newUser);
        } catch (err) {
          // ignore
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [setUser]);

  useEffect(() => {
    if (!authLoading) fetchProjects(1);
  }, [query]);

  return (
    <div className="page-container">
      <PageHeader title="Manage Projects" btnLabel={canCreate ? "Create Project" : undefined} onBtnClick={() => navigate("/projects/create")}>
        <div style={{ marginRight: "16px" }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #ddd" }}
          />
        </div>
      </PageHeader>

      {loading ? (
        <LoadingSpinner message="Loading projects..." />
      ) : (
        <>
          <table className="role-table" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Team</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project._id}>
                  <td>{project.name}</td>
                  <td>{project.description}</td>
                  <td>
                    {project.deadline
                      ? new Date(project.deadline).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <StatusBadge
                      status={project.status === "active" ? "Active" : "Inactive"}
                    />
                  </td>
                  <td>
                    {(project.team || [])
                      .map((u) => u.name || u.email || "")
                      .join(", ")}
                  </td>
                  {(canEdit || canDelete) && (
                    <ActionButtons
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={() => navigate(`/projects/edit/${project._id}`)}
                      onDelete={async () => {
                        if (
                          window.confirm(
                            "Are you sure you want to delete this project?",
                          )
                        ) {
                          await axiosInstance.delete(`/projects/${project._id}`);
                          fetchProjects();
                        }
                      }}
                    />
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalProjects}
            onPageChange={(page) => fetchProjects(page)}
          />
        </>
      )}
    </div>
  );
};

export default ManageProject;
