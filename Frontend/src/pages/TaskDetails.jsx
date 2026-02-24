import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [hoverUser, setHoverUser] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

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

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users");
      setUsers(Array.isArray(res.data) ? res.data : (res.data.users || []));
    } catch (err) {
      console.log("Error fetching users for mentions", err);
    }
  };

  useEffect(() => {
    fetchTask();
    fetchUsers();
  }, []);

  const getHandle = (u) => {
    if (!u) return "user";
    if (u.username) return u.username;
    if (u.email) return u.email.split("@")[0];
    if (u.name) return u.name.replace(/\s+/g, "").toLowerCase();
    return "user";
  };

  const resolveHandleToUser = (handle) => {
    if (!handle) return null;
    const h = handle.replace(/^@/, "").toLowerCase();
    return users.find((u) => {
      const candidates = [
        u.username && u.username.toLowerCase(),
        u.email && u.email.split("@")[0].toLowerCase(),
        u.name && u.name.replace(/\s+/g, "").toLowerCase(),
      ].filter(Boolean);

      return candidates.includes(h);
    });
  };

  const renderDescription = (text) => {
    if (!text) return null;
    // Split on @mentions but keep the marker
    const parts = text.split(/(@[A-Za-z0-9_\.-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        const matchedUser = resolveHandleToUser(part);
        return (
          <span
            key={i}
            className="mention"
            onMouseEnter={(e) => {
              if (matchedUser) {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverPos({ x: rect.left, y: rect.bottom + 6 });
                setHoverUser(matchedUser);
              }
            }}
            onMouseLeave={() => setHoverUser(null)}
            style={{ color: "#1a73e8", cursor: matchedUser ? "pointer" : "default", fontWeight: 600 }}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

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
            <p style={{ position: "relative" }}>
              {renderDescription(task.description)}
            </p>
            {hoverUser && (
              <div
                className="mention-popup"
                style={{
                  position: "fixed",
                  top: hoverPos.y,
                  left: hoverPos.x,
                  background: "white",
                  padding: 12,
                  borderRadius: 6,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                  zIndex: 2000,
                  minWidth: 200,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="avatar-circle small" style={{ width: 36, height: 36, fontSize: 14 }}>
                    {hoverUser.name ? hoverUser.name.charAt(0).toUpperCase() : (hoverUser.email?.charAt(0) || "U")} 
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{hoverUser.name || hoverUser.email}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{hoverUser.email}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{hoverUser.role?.name}</div>
                  </div>
                </div>
              </div>
            )}
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
            <label>Created By</label>
            <p>{task.createdBy?.email}</p>
          </div>
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
