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

        {/* Header */}
        <div className="task-header">
          <div>
            <h2>Task Details</h2>
            <p className="task-id">ID: {task._id}</p>
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

        {/* Info Grid */}
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

          <div className="detail-box full-width">
            <label>Description</label>
            <p>{task.description}</p>
          </div>

          <div className="detail-box">
            <label>Start Date</label>
            <p>
              {task.startDate
                ? new Date(task.startDate).toLocaleDateString()
                : "Not set"}
            </p>
          </div>

          <div className="detail-box">
            <label>End Date</label>
            <p>
              {task.endDate
                ? new Date(task.endDate).toLocaleDateString()
                : "Not set"}
            </p>
          </div>

          <div className="detail-box">
            <label>Completion Status</label>
            <span
              className={`status-badge ${
                task.completionStatus === "Completed"
                  ? "completed"
                  : task.completionStatus === "Cancelled"
                  ? "cancelled"
                  : "pending"
              }`}
            >
              {task.completionStatus}
            </span>
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

        {/* Images */}
        {task.images && task.images.length > 0 && (
          <div className="media-section">
            <h3>Images</h3>
            <div className="image-grid">
              {task.images.map((img, index) => (
                <img key={index} src={img} alt="task" />
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {task.videos && task.videos.length > 0 && (
          <div className="media-section">
            <h3>Videos</h3>
            <div className="video-grid">
              {task.videos.map((video, index) => (
                <video key={index} src={video} controls />
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="media-section">
            <h3>Attachments</h3>
            <ul className="attachment-list">
              {task.attachments.map((file, index) => (
                <li key={index}>
                  <a href={file} target="_blank" rel="noreferrer">
                    Download File {index + 1}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

export default TaskDetails;
