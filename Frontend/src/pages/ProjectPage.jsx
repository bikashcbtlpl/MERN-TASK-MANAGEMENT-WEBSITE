
import React from "react";
import ProjectForm from "./ProjectForm";
import axiosInstance from "../api/axiosInstance";

const ProjectPage = () => {
  const handleProjectSubmit = async (data) => {
    try {
      // Convert team to array of user IDs
      const payload = {
        ...data,
        team: data.team.map(u => u.value),
      };
      await axiosInstance.post("/projects", payload);
      alert("Project Created Successfully!");
      // Optionally, redirect or refresh project list
    } catch (err) {
      alert("Error creating project: " + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="page-container">
      <h2>Create Project</h2>
      <ProjectForm onSubmit={handleProjectSubmit} />
    </div>
  );
};

export default ProjectPage;
