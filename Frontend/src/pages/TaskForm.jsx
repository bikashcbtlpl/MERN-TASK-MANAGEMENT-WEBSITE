import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function TaskForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    taskStatus: "Open",
    completionStatus: "Pending",
    startDate: "",
    endDate: "",
    notes: "",
    assignedTo: "",
    images: [],
    videos: [],
    attachments: [],
  });

  /* ================= STATUS VALIDATION ================= */
  const validateStatus = () => {
    const openStates = ["Open", "In Progress", "On Hold"];

    if (
      openStates.includes(formData.taskStatus) &&
      formData.completionStatus !== "Pending"
    ) {
      alert(
        "Open / In Progress / On Hold tasks must have completion status = Pending"
      );
      return false;
    }

    if (
      formData.taskStatus === "Closed" &&
      !["Completed", "Cancelled"].includes(formData.completionStatus)
    ) {
      alert(
        "Closed tasks must have completion status = Completed or Cancelled"
      );
      return false;
    }

    return true;
  };

  /* ================= FETCH USERS ================= */
  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users");

      const loggedInUser = JSON.parse(localStorage.getItem("user"));

      if (loggedInUser?.role !== "Super Admin") {
        const filtered = res.data.filter(
          (user) => user.role?.name !== "Super Admin"
        );
        setUsers(filtered);
      } else {
        setUsers(res.data);
      }
    } catch (error) {
      console.log("Error fetching users");
    }
  };

  /* ================= FETCH TASK ================= */
  const fetchTask = async () => {
    try {
      const res = await axiosInstance.get(`/tasks/${id}`);

      setFormData({
        title: res.data.title || "",
        description: res.data.description || "",
        taskStatus: res.data.taskStatus || "Open",
        completionStatus: res.data.completionStatus || "Pending",
        startDate: res.data.startDate
          ? res.data.startDate.split("T")[0]
          : "",
        endDate: res.data.endDate
          ? res.data.endDate.split("T")[0]
          : "",
        notes: res.data.notes || "",
        assignedTo: res.data.assignedTo?._id || "",
        images: res.data.images || [],
        videos: res.data.videos || [],
        attachments: res.data.attachments || [],
      });
    } catch (error) {
      console.log("Error fetching task");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
      if (isEditMode) await fetchTask();
      setLoading(false);
    };
    loadData();
  }, []);

  /* ================= FILE INPUT ================= */
  const handleFileChange = (e, field) => {
    const files = Array.from(e.target.files);
    const fileNames = files.map((file) => file.name);

    setFormData({
      ...formData,
      [field]: fileNames,
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔥 FRONTEND VALIDATION FIRST
    if (!validateStatus()) return;

    try {
      if (isEditMode) {
        await axiosInstance.put(`/tasks/${id}`, formData);
      } else {
        await axiosInstance.post("/tasks", formData);
      }

      navigate("/tasks");
    } catch (error) {
      alert(error.response?.data?.message || "Error saving task");
    }
  };

  if (loading) return <div className="loading-page">Loading...</div>;

  return (
    <div className="task-page">
      <div className="task-card">
        <div className="task-header">
          <h2>{isEditMode ? "Edit Task" : "Create Task"}</h2>
        </div>

        <form onSubmit={handleSubmit} className="task-grid">

          {/* BASIC INFO */}
          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Task Status</label>
              <select
                value={formData.taskStatus}
                onChange={(e) =>
                  setFormData({ ...formData, taskStatus: e.target.value })
                }
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* SCHEDULE */}
          <div className="form-section">
            <h3>Schedule</h3>

            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Completion Status</label>
              <select
                value={formData.completionStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    completionStatus: e.target.value,
                  })
                }
              >
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* ASSIGNMENT */}
          <div className="form-section">
            <h3>Assignment</h3>

            <div className="form-group">
              <label>Assign User</label>
              <select
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assignedTo: e.target.value,
                  })
                }
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="form-section full-width">
            <h3>Attachments</h3>

            <div className="form-group">
              <label>Upload Images</label>
              <input type="file" multiple onChange={(e) => handleFileChange(e, "images")} />
            </div>

            <div className="form-group">
              <label>Upload Videos</label>
              <input type="file" multiple onChange={(e) => handleFileChange(e, "videos")} />
            </div>

            <div className="form-group">
              <label>Upload Attachments</label>
              <input type="file" multiple onChange={(e) => handleFileChange(e, "attachments")} />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="form-actions">
            <button type="submit" className="primary-btn">
              {isEditMode ? "Update Task" : "Create Task"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate("/tasks")}
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default TaskForm;
