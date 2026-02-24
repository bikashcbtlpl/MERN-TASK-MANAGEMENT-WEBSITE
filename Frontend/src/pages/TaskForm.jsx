import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function TaskForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [mentionInput, setMentionInput] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    taskStatus: "Open",
    project: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const [dateError, setDateError] = useState("");
  const [existingFiles, setExistingFiles] = useState({ images: [], videos: [], attachments: [] });
  const [files, setFiles] = useState({ images: [], videos: [], attachments: [] });

  const validateDates = (start, end) => {
    if (start && end && new Date(end) < new Date(start)) {
      setDateError("End date cannot be before start date");
      return false;
    }
    setDateError("");
    return true;
  };

  const getHandle = (u) => {
    if (!u) return "user";
    if (u.username) return u.username;
    if (u.email) return u.email.split("@")[0];
    if (u.name) return u.name.replace(/\s+/g, "").toLowerCase();
    return "user";
  };

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users");
      const loggedIn = JSON.parse(localStorage.getItem("user")) || {};
      const list = Array.isArray(res.data) ? res.data : res.data.users || [];
      if (loggedIn.role?.name !== "Super Admin") {
        setUsers(list.filter((u) => u.role?.name !== "Super Admin"));
      } else {
        setUsers(list);
      }
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await axiosInstance.get("/projects");
      const data = res.data || {};
      const list = Array.isArray(data) ? data : data.projects || [];
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching projects", err);
    }
  };

  const fetchTask = async (taskId) => {
    try {
      const res = await axiosInstance.get(`/tasks/${taskId}`);
      const t = res.data || {};
      setFormData((f) => ({
        ...f,
        title: t.title || "",
        description: t.description || "",
        taskStatus: t.taskStatus || "Open",
        project: t.project?._id || t.project || "",
        startDate: t.startDate ? t.startDate.split("T")[0] : "",
        endDate: t.endDate ? t.endDate.split("T")[0] : "",
        isActive: t.isActive ?? true,
      }));

      setExistingFiles({ images: t.images || [], videos: t.videos || [], attachments: t.attachments || [] });
    } catch (err) {
      console.error("Error fetching task", err);
    }
  };

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchUsers(), fetchProjects()]);
      if (isEditMode) await fetchTask(id);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleFileChange = (e, field) => {
    setFiles((s) => ({ ...s, [field]: Array.from(e.target.files) }));
  };

  const removeExistingFile = (field, index) => {
    setExistingFiles((s) => {
      const copy = [...(s[field] || [])];
      copy.splice(index, 1);
      return { ...s, [field]: copy };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateDates(formData.startDate, formData.endDate)) return;

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, v);
      });

      payload.append("existingImages", JSON.stringify(existingFiles.images || []));
      payload.append("existingVideos", JSON.stringify(existingFiles.videos || []));
      payload.append("existingAttachments", JSON.stringify(existingFiles.attachments || []));

      files.images.forEach((f) => payload.append("images", f));
      files.videos.forEach((f) => payload.append("videos", f));
      files.attachments.forEach((f) => payload.append("attachments", f));

      if (isEditMode) {
        await axiosInstance.put(`/tasks/${id}`, payload);
      } else {
        await axiosInstance.post("/tasks", payload);
      }

      navigate("/tasks");
    } catch (err) {
      console.error("Save task error", err);
      alert(err.response?.data?.message || "Error saving task");
    }
  };

  if (loading) return <div className="loading-page">Loading...</div>;

  const projectOptions = [{ value: "", label: "No Project" }, ...projects.map((p) => ({ value: p._id, label: p.name }))];

  return (
    <div className="task-page">
      <div className="task-card">
        <div className="task-header">
          <h2>{isEditMode ? "Edit Task" : "Create Task"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="task-grid">
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label>Title</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>

            <div className="form-group">
              <label>Task Status</label>
              <select value={formData.taskStatus} onChange={(e) => setFormData({ ...formData, taskStatus: e.target.value })}>
                <option>Open</option>
                <option>In Progress</option>
                <option>Pending</option>
                <option>On Hold</option>
                <option>Closed</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>

            <div className="form-group">
              <label>Project</label>
              <select value={formData.project || ""} onChange={(e) => setFormData({ ...formData, project: e.target.value })}>
                {projectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isEditMode && (
              <div className="form-group">
                <label>Task Visibility</label>
                <select value={formData.isActive ? "Active" : "Inactive"} onChange={(e) => setFormData({ ...formData, isActive: e.target.value === "Active" })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

            <div className="form-group full-width" style={{ position: "relative" }}>
              <label>Description</label>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  const match = e.target.value.match(/@\w*$/);
                  setMentionInput(match ? match[0] : "");
                }}
                required
              />

              {mentionInput && mentionInput.startsWith("@") && (
                <div className="mention-dropdown">
                  {users
                    .filter((u) => {
                      const search = mentionInput.slice(1).toLowerCase();
                      const handle = getHandle(u).toLowerCase();
                      return (u.name && u.name.toLowerCase().startsWith(search)) || handle.startsWith(search);
                    })
                    .map((user) => (
                      <div
                        key={user._id}
                        className="mention-option"
                        onClick={() => {
                          setFormData((f) => ({ ...f, description: f.description.replace(/@\w*$/, `@${getHandle(user)} `) }));
                          setMentionInput("");
                        }}
                      >
                        {user.name} <span style={{ color: "#888" }}>@{getHandle(user)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* SCHEDULE */}
          <div className="form-section">
            <h3>Schedule</h3>

            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={formData.startDate} onChange={(e) => { setFormData({ ...formData, startDate: e.target.value }); validateDates(e.target.value, formData.endDate); }} />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={formData.endDate} onChange={(e) => { setFormData({ ...formData, endDate: e.target.value }); validateDates(formData.startDate, e.target.value); }} />
              {dateError && <small style={{ color: "red", display: "block", marginTop: "4px" }}>{dateError}</small>}
            </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="form-section full-width">
            <h3>Attachments</h3>

            {isEditMode && (
              <div className="existing-files">
                {["images", "videos", "attachments"].map((field) => existingFiles[field]?.length > 0 && (
                  <div key={field} className="existing-group">
                    <label>{field.toUpperCase()}</label>
                    {existingFiles[field].map((f, i) => (
                      <div key={i} className="existing-item">
                        <span>{f ? f.split("/").pop() : ""}</span>
                        <button type="button" className="delete-btn" onClick={() => removeExistingFile(field, i)}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label>Upload Images</label>
              <input type="file" multiple accept="image/*" onChange={(e) => handleFileChange(e, "images")} />
            </div>

            <div className="form-group">
              <label>Upload Videos</label>
              <input type="file" multiple accept="video/*" onChange={(e) => handleFileChange(e, "videos")} />
            </div>

            <div className="form-group">
              <label>Upload Attachments</label>
              <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" onChange={(e) => handleFileChange(e, "attachments")} />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-btn">{isEditMode ? "Update Task" : "Create Task"}</button>
            <button type="button" className="secondary-btn" onClick={() => navigate("/tasks")}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskForm;
