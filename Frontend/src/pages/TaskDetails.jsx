import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));
  const permissions = user?.permissions || [];
  const canEdit = permissions.includes("Edit Task");

  const fetchTask = async () => {
    try {
      const res = await axiosInstance.get(`/tasks/${id}`);
      setTask(res.data);
    } catch (error) {
      console.log("Error fetching task");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
  }, []);

  if (loading) return <div className="loading-page">Loading...</div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div className="task-page">
      <div className="task-card">

        {/* HEADER */}
        <div className="task-header">
          <div>
            <h2>Task Details</h2>
            <p className="task-id">TASK ID: {task._id}</p>
          </div>

          <div className="header-actions">
            {canEdit && (
              <button
                className="primary-btn"
                onClick={() => navigate(`/tasks/edit/${task._id}`)}
              >
                Edit
              </button>
            )}

            <button
              className="secondary-btn"
              onClick={() => navigate("/tasks")}
            >
              Back
            </button>
          </div>
        </div>

        {/* INFO GRID */}
        <div className="details-grid">

          <div className="detail-box">
            <label>Title</label>
            <p>{task.title}</p>
          </div>

          <div className="detail-box">
            <label>Task Status</label>
            <span className={`status-badge ${task.taskStatus?.toLowerCase().replace(" ", "-")}`}>
              {task.taskStatus}
            </span>
          </div>

          {/* ✅ NEW: ACTIVE / INACTIVE STATUS */}
          <div className="detail-box">
            <label>Task Visibility</label>
            <span className={`status-badge ${task.isActive ? "active" : "inactive"}`}>
              {task.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="detail-box full-width">
            <label>Description</label>
            <p>{task.description}</p>
          </div>

          <div className="detail-box">
            <label>Start Date</label>
            <p>{task.startDate ? new Date(task.startDate).toLocaleDateString() : "Not set"}</p>
          </div>

          <div className="detail-box">
            <label>End Date</label>
            <p>{task.endDate ? new Date(task.endDate).toLocaleDateString() : "Not set"}</p>
          </div>

          <div className="detail-box">
            <label>Assigned To</label>
            <p>{task.assignedTo?.email || "Unassigned"}</p>
          </div>

          <div className="detail-box">
            <label>Created By</label>
            <p>{task.createdBy?.email}</p>
          </div>

          {task.notes && (
            <div className="detail-box full-width">
              <label>Notes</label>
              <p>{task.notes}</p>
            </div>
          )}
        </div>

        {/* ================= IMAGES ================= */}
        {task.images?.length > 0 && (
          <div className="media-section">
            <h3>Images</h3>

            <div className="image-grid">
              {task.images.map((img, i) => (
                <a key={i} href={img} target="_blank" rel="noreferrer">
                  <img
                    src={img}
                    alt="task"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ================= VIDEOS ================= */}
        {task.videos?.length > 0 && (
          <div className="media-section">
            <h3>Videos</h3>

            <div className="video-grid">
              {task.videos.map((video, i) => (
                <video
                  key={i}
                  controls
                  className="task-video"
                  onError={(e) => (e.target.style.display = "none")}
                >
                  <source src={video} />
                  Your browser does not support the video tag.
                </video>
              ))}
            </div>
          </div>
        )}

        {/* ================= ATTACHMENTS ================= */}
        {task.attachments?.length > 0 && (
          <div className="media-section">
            <h3>Attachments</h3>

            <ul className="attachment-list">
              {task.attachments.map((file, i) => {
                const fileName = file ? decodeURIComponent(file.split("/").pop()) : "file";

                return (
                  <li key={i} className="attachment-item">
                    <span className="file-icon">📄</span>

                    <a
                      href={`${file}?fl_attachment`}
                      target="_blank"
                      rel="noreferrer"
                      className="attachment-link"
                    >
                      {fileName}
                    </a>

                    <a
                      href={`${file}?fl_attachment`}
                      target="_blank"
                      rel="noreferrer"
                      className="download-btn"
                    >
                      Download
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

export default TaskDetails;
