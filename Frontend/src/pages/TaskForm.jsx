import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Select from "react-select";   // ✅ added

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
    startDate: "",
    endDate: "",
    notes: "",
    assignedTo: "",
    isActive: true,
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

  const validateDates = (start, end) => {
    if (start && end && new Date(end) < new Date(start)) {
      setDateError("End date cannot be before start date");
      return false;
    }
    setDateError("");
    return true;
  };

  const fetchUsers = async () => {
    try {
      const res = await axiosInstance.get("/users");
      const loggedInUser = JSON.parse(localStorage.getItem("user"));

      if (loggedInUser?.role?.name !== "Super Admin") {
        const filtered = res.data.filter(
          (user) => user.role?.name !== "Super Admin"
        );
        setUsers(filtered);
      } else {
        setUsers(res.data);
      }
    } catch (err) {
      console.log("Error fetching users:", err);
    }
  };

  const fetchTask = async () => {
    try {
      const res = await axiosInstance.get(`/tasks/${id}`);

      setFormData({
        title: res.data.title || "",
        description: res.data.description || "",
        taskStatus: res.data.taskStatus || "Open",
        startDate: res.data.startDate?.split("T")[0] || "",
        endDate: res.data.endDate?.split("T")[0] || "",
        notes: res.data.notes || "",
        assignedTo: res.data.assignedTo?._id || "",
        isActive: res.data.isActive ?? true,
      });

      setExistingFiles({
        images: res.data.images || [],
        videos: res.data.videos || [],
        attachments: res.data.attachments || [],
      });
    } catch (err) {
      console.log("Error fetching task:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
      if (isEditMode) await fetchTask();
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleFileChange = (e, field) => {
    setFiles({
      ...files,
      [field]: Array.from(e.target.files),
    });
  };

  const removeExistingFile = (field, index) => {
    const updated = [...existingFiles[field]];
    updated.splice(index, 1);
    setExistingFiles({ ...existingFiles, [field]: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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

  const userOptions = [
    { value: "", label: "Unassigned" },
    ...users.map((u) => ({
      value: u._id,
      label: u.name || u.email,
    })),
  ];

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
                <option>Pending</option>
                <option>On Hold</option>
                <option>Closed</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>

            {isEditMode && (
              <div className="form-group">
                <label>Task Visibility</label>
                <select
                  value={formData.isActive ? "Active" : "Inactive"}
                  onChange={(e)=>
                    setFormData({
                      ...formData,
                      isActive: e.target.value === "Active"
                    })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            )}

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
          </div>

          {/* ASSIGN */}
          <div className="form-section">
            <h3>Assignment</h3>

            <div className="form-group">
              <label>Assign User</label>

              {/* ✅ SEARCHABLE DROPDOWN */}
              <Select
                options={userOptions}
                value={userOptions.find(o => o.value === formData.assignedTo)}
                onChange={(selected)=>
                  setFormData({
                    ...formData,
                    assignedTo: selected?.value || ""
                  })
                }
                isSearchable
                isClearable
                placeholder="Search user..."
              />
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
                          <span>{f.split("/").pop()}</span>
                          <button
                            type="button"
                            className="delete-btn"
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
