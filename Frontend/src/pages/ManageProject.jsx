import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import ProjectForm from "./ProjectForm";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ManageProject = () => {
  const [projects, setProjects] = useState([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading, setUser } = useAuth();

  const perms = (user?.role?.permissions || []).map((p) => (typeof p === 'string' ? p : (p && p.name) || ''));
  const canCreate = user?.role?.name === "Super Admin" || perms.includes("Create Project");
  const canEdit = user?.role?.name === "Super Admin" || perms.includes("Edit Project");
  const canDelete = user?.role?.name === "Super Admin" || perms.includes("Delete Project");

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
    // Wait until auth finished so backend sees correct user and UI permissions are accurate
    if (!authLoading) fetchProjects(1);
  }, [authLoading]);

  // Listen for changes to localStorage user (permissions may change elsewhere)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'user') {
        try {
          const newUser = e.newValue ? JSON.parse(e.newValue) : null;
          if (newUser) setUser(newUser);
        } catch (err) {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [setUser]);

  useEffect(() => {
    // Trigger new search when query changes
    // reset to first page
    if (!authLoading) fetchProjects(1);
  }, [query]);

  const handleCreate = () => {
    navigate("/projects/create");
  };

  const handleEdit = (project) => {
    navigate(`/projects/edit/${project._id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      await axiosInstance.delete(`/projects/${id}`);
      fetchProjects();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>Manage Projects</h2>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <input
            type="text"
            placeholder="Search projects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{padding:8,borderRadius:4,border:'1px solid #ddd'}}
          />
          {canCreate && (
            <button className="primary-btn" onClick={handleCreate}>Create Project</button>
          )}
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
        <table className="role-table" style={{marginTop:20}}>
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
            {projects.map(project => (
              <tr key={project._id}>
                <td>{project.name}</td>
                <td>{project.description}</td>
                <td>{project.deadline ? new Date(project.deadline).toLocaleDateString() : "-"}</td>
                <td>{project.status}</td>
                <td>{(project.team||[]).map(u => (u.name || u.email || '')).join(", ")}</td>
                {(canEdit || canDelete) && (
                  <td>
                    {canEdit && <button className="edit-role-btn" onClick={()=>handleEdit(project)}>Edit</button>}
                    {canDelete && <button className="delete-role-btn" onClick={()=>handleDelete(project._id)}>Delete</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button disabled={currentPage === 1} onClick={() => fetchProjects(currentPage - 1)}>Prev</button>
            <span>Page {currentPage} of {totalPages} — Total: {totalProjects}</span>
            <button disabled={currentPage === totalPages} onClick={() => fetchProjects(currentPage + 1)}>Next</button>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default ManageProject;
