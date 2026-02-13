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
  });

  const [dateError, setDateError] = useState("");

  const [existingFiles, setExistingFiles] = useState({
    images: [],
    videos: [],
    attachments: [],
  });

  const [files, setFiles] = useState({
    images: [],
    videos: [],
    attachments: [],
  });

  /* ================= DATE VALIDATION ================= */
  const validateDates = (start, end) => {
    if (start && end && new Date(end) < new Date(start)) {
      setDateError("End date cannot be before start date");
      return false;
    }
    setDateError("");
    return true;
  };

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
    } catch {
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
        startDate: res.data.startDate?.split("T")[0] || "",
        endDate: res.data.endDate?.split("T")[0] || "",
        notes: res.data.notes || "",
        assignedTo: res.data.assignedTo?._id || "",
      });

      setExistingFiles({
        images: res.data.images || [],
        videos: res.data.videos || [],
        attachments: res.data.attachments || [],
      });

    } catch {
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
    setFiles({
      ...files,
      [field]: Array.from(e.target.files),
    });
  };

  /* ================= DELETE EXISTING FILE ================= */
  const removeExistingFile = (field, index) => {
    const updated = [...existingFiles[field]];
    updated.splice(index, 1);
    setExistingFiles({ ...existingFiles, [field]: updated });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStatus()) return;
    if (!validateDates(formData.startDate, formData.endDate)) return;

    try {
      const payload = new FormData();

      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) payload.append(k, v);
      });

      payload.append("existingImages", JSON.stringify(existingFiles.images));
      payload.append("existingVideos", JSON.stringify(existingFiles.videos));
      payload.append(
        "existingAttachments",
        JSON.stringify(existingFiles.attachments)
      );

      files.images.forEach((f) => payload.append("images", f));
      files.videos.forEach((f) => payload.append("videos", f));
      files.attachments.forEach((f) => payload.append("attachments", f));

      if (isEditMode) {
        await axiosInstance.put(`/tasks/${id}`, payload);
      } else {
        await axiosInstance.post("/tasks", payload);
      }

      navigate("/tasks");
    } catch (error) {
      alert(error.response?.data?.message || "Error saving task");
    }
  };

  if (loading) return <div className="loading-page">Loading...</div>;

  const getName = (url) => {
    try {
      return decodeURIComponent(url.split("/").pop());
    } catch {
      return "file";
    }
  };

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
                onChange={(e)=>setFormData({...formData,title:e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Task Status</label>
              <select
                value={formData.taskStatus}
                onChange={(e)=>setFormData({...formData,taskStatus:e.target.value})}
              >
                <option>Open</option>
                <option>In Progress</option>
                <option>On Hold</option>
                <option>Closed</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Description</label>
              <textarea
                rows="4"
                value={formData.description}
                onChange={(e)=>setFormData({...formData,description:e.target.value})}
                required
              />
            </div>
          </div>

          {/* SCHEDULE */}
          <div className="form-section">
            <h3>Schedule</h3>

            <div className="form-group">
              <label>Start Date</label>
              <input type="date"
                value={formData.startDate}
                onChange={(e)=>{
                  const val=e.target.value;
                  setFormData({...formData,startDate:val});
                  validateDates(val,formData.endDate);
                }}
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input type="date"
                value={formData.endDate}
                onChange={(e)=>{
                  const val=e.target.value;
                  setFormData({...formData,endDate:val});
                  validateDates(formData.startDate,val);
                }}
              />
              {dateError && (
                <small style={{color:"red",display:"block",marginTop:"4px"}}>
                  {dateError}
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Completion Status</label>
              <select
                value={formData.completionStatus}
                onChange={(e)=>setFormData({...formData,completionStatus:e.target.value})}
              >
                <option>Pending</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>


          {/* ASSIGN */}
          <div className="form-section">
            <h3>Assignment</h3>

            <div className="form-group">
              <label>Assign User</label>
              <select
                value={formData.assignedTo}
                onChange={(e)=>setFormData({...formData,assignedTo:e.target.value})}
              >
                <option value="">Unassigned</option>
                {users.map(u=>(
                  <option key={u._id} value={u._id}>{u.email}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(e)=>setFormData({...formData,notes:e.target.value})}
              />
            </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="form-section full-width">
            <h3>Attachments</h3>

            {isEditMode && (
              <div className="existing-files">

                {["images","videos","attachments"].map(field => (
                  existingFiles[field]?.length > 0 && (
                    <div key={field} className="existing-group">
                      <label>{field.toUpperCase()}</label>

                      {existingFiles[field].map((f,i)=>(
                        <div key={i} className="existing-item">
                          <span>{getName(f)}</span>

                          <button
                            type="button"
                            className="delete-btn"
                            aria-label="Remove file"
                            onClick={()=>removeExistingFile(field,i)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                    </div>
                  )
                ))}

              </div>
            )}

            <div className="form-group">
              <label>Upload Images</label>
              <input type="file" multiple accept="image/*"
                onChange={(e)=>handleFileChange(e,"images")} />
            </div>

            <div className="form-group">
              <label>Upload Videos</label>
              <input type="file" multiple accept="video/*"
                onChange={(e)=>handleFileChange(e,"videos")} />
            </div>

            <div className="form-group">
              <label>Upload Attachments</label>
              <input type="file" multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                onChange={(e)=>handleFileChange(e,"attachments")} />
            </div>

          </div>

          <div className="form-actions">
            <button type="submit" className="primary-btn">
              {isEditMode ? "Update Task" : "Create Task"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={()=>navigate("/tasks")}
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
