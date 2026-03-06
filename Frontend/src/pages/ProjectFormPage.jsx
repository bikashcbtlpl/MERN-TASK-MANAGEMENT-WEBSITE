import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProjectForm from "./ProjectForm";
import axiosInstance from "../api/axiosInstance";
import { LoadingSpinner } from "../components/common";

const ProjectFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(mode === "edit");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode === "edit" && id) {
      axiosInstance
        .get(`/projects/${id}`)
        .then((res) => {
          setInitialData(res.data);
        })
        .catch((err) => {
          console.error("Failed to load project:", err);
          const msg = err.response?.data?.message || "Failed to load project";
          setError(msg);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [mode, id]);

  const handleSubmit = async (data) => {
    try {
      if (mode === "edit") {
        await axiosInstance.put(`/projects/${id}`, {
          ...data,
          team: data.team.map((u) => u.value ?? u),
        });
      } else {
        await axiosInstance.post("/projects", {
          ...data,
          team: data.team.map((u) => u.value ?? u),
        });
      }
      navigate("/projects");
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || "Error saving project";
      setError(msg);
    }
  };

  if (loading)
    return (
      <LoadingSpinner
        message={mode === "edit" ? "Loading project..." : "Please wait..."}
      />
    );

  if (error) {
    return (
      <div
        className="page-container"
        style={{ textAlign: "center", paddingTop: 60 }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: "#ef4444", fontWeight: 600 }}>{error}</p>
        <button
          onClick={() => navigate("/projects")}
          style={{
            marginTop: 16,
            padding: "8px 20px",
            borderRadius: 6,
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/projects")}
          style={{
            background: "none",
            border: "none",
            color: "#64748b",
            cursor: "pointer",
            fontSize: 20,
            padding: 0,
            lineHeight: 1,
          }}
          title="Back to projects"
        >
          ←
        </button>
        <h2 style={{ margin: 0 }}>
          {mode === "edit" ? "Edit Project" : "Create Project"}
        </h2>
      </div>
      <ProjectForm
        onSubmit={handleSubmit}
        initialData={initialData}
        mode={mode}
      />
    </div>
  );
};

export default ProjectFormPage;
