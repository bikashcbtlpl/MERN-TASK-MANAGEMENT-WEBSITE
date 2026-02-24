import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProjectForm from "./ProjectForm";
import axiosInstance from "../api/axiosInstance";

const ProjectFormPage = ({ mode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode === "edit" && id) {
      axiosInstance.get(`/projects/${id}`).then(res => {
        setInitialData(res.data);
        setLoading(false);
      });
    }
  }, [mode, id]);

  const handleSubmit = async (data) => {
    try {
      if (mode === "edit") {
        await axiosInstance.put(`/projects/${id}`, {
          ...data,
          team: data.team.map(u => u.value),
        });
      } else {
        await axiosInstance.post("/projects", {
          ...data,
          team: data.team.map(u => u.value),
        });
      }
      navigate("/projects");
    } catch (err) {
      alert("Error saving project: " + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="page-container">
      <h2>{mode === "edit" ? "Edit Project" : "Create Project"}</h2>
      <ProjectForm onSubmit={handleSubmit} initialData={initialData} />
    </div>
  );
};

export default ProjectFormPage;
