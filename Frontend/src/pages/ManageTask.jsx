import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";
import { toast } from "react-toastify";
import Select from "react-select";   // ✅ ADDED

function ManageTask() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [isActive, setIsActive] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));
  const permissions = user?.permissions || [];

  const canView = permissions.includes("View Task");
  const canCreate = permissions.includes("Create Task");
  const canEdit = permissions.includes("Edit Task");
  const canDelete = permissions.includes("Delete Task");

  /* FETCH USERS */
  useEffect(() => {
    axiosInstance.get("/users")
      .then(res => setUsers(res.data || []))
      .catch(() => {});
  }, []);

  /* FETCH TASKS */
  const fetchTasks = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page,
          limit: 10,
        });

        if (search) params.append("search", search);
        if (taskStatus) params.append("taskStatus", taskStatus);
        if (isActive !== "") params.append("isActive", isActive);

        const res = await axiosInstance.get(`/tasks?${params.toString()}`);

        setTasks(res.data.tasks || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalTasks(res.data.totalTasks || 0);

        if (page > 1 && res.data.tasks.length === 0) {
          setCurrentPage(page - 1);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Error fetching tasks");
      } finally {
        setLoading(false);
      }
    },
    [search, taskStatus, isActive]
  );

  useEffect(() => {
    if (canView || canCreate || canEdit || canDelete) {
      fetchTasks(currentPage);
    }
  }, [currentPage, fetchTasks]);

  useEffect(() => {
    const handler = () => fetchTasks(currentPage);
    socket.on("taskUpdated", handler);
    return () => socket.off("taskUpdated", handler);
  }, [currentPage, fetchTasks]);

  /* INLINE UPDATE */
  const updateTaskField = async (id, data) => {
    try {
      await axiosInstance.put(`/tasks/${id}`, data);
      toast.success("Task updated");
      fetchTasks(currentPage);
    } catch {
      toast.error("Update failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      await axiosInstance.delete(`/tasks/${id}`);
      toast.success("Task deleted successfully");
      fetchTasks(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting task");
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  /* ✅ CREATE SEARCHABLE OPTIONS */
  const userOptions = [
    { value: "", label: "Unassigned" },
    ...users.map(u => ({
      value: u._id,
      label: u.name ? `${u.name} (${u.email})` : u.email
    }))
  ];

  return (
    <div className="manage-role-container">
      <div className="manage-role-header">
        <h2>Manage Task</h2>

        {canCreate && (
          <button
            className="create-role-btn"
            onClick={() => navigate("/tasks/create")}
          >
            + Create Task
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="task-filters">
        <input
          type="text"
          placeholder="Search title or description..."
          value={search}
          onChange={(e) => {
            setCurrentPage(1);
            setSearch(e.target.value);
          }}
        />

        <select
          value={taskStatus}
          onChange={(e) => {
            setCurrentPage(1);
            setTaskStatus(e.target.value);
          }}
        >
          <option value="">All Task Status</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="On Hold">On Hold</option>
          <option value="Closed">Closed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          value={isActive}
          onChange={(e) => {
            setCurrentPage(1);
            setIsActive(e.target.value);
          }}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <button
          onClick={() => {
            setSearch("");
            setTaskStatus("");
            setIsActive("");
            setCurrentPage(1);
          }}
        >
          Reset
        </button>
      </div>

      <p>Total Tasks: <strong>{totalTasks}</strong></p>

      {loading ? (
        <div style={{ padding: "20px" }}>Loading tasks...</div>
      ) : (
        <>
          <table className="role-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Status</th>
                <th>Task Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Assigned</th>
                <th>Files</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {tasks.map((task, index) => (
                <tr key={task._id} onClick={() => navigate(`/tasks/${task._id}`)}>

                  <td>{(currentPage - 1) * 10 + index + 1}</td>
                  <td>{task.title}</td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <select
                        value={task.isActive ? "true" : "false"}
                        onChange={(e) =>
                          updateTaskField(task._id, {
                            isActive: e.target.value === "true",
                          })
                        }
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      task.isActive ? "Active" : "Inactive"
                    )}
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <select
                        value={task.taskStatus}
                        onChange={(e) =>
                          updateTaskField(task._id, {
                            taskStatus: e.target.value,
                          })
                        }
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Pending</option>
                        <option>On Hold</option>
                        <option>Closed</option>
                        <option>Completed</option>
                        <option>Cancelled</option>
                      </select>
                    ) : (
                      task.taskStatus
                    )}
                  </td>

                  <td>{formatDate(task.startDate)}</td>
                  <td>{formatDate(task.endDate)}</td>

                  {/* ✅ SEARCHABLE ASSIGNED DROPDOWN */}
                  <td onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <Select
                        className="inline-select"
                        classNamePrefix="react-select"
                        options={[
                          { value: "", label: "Unassigned" },
                          ...users.map(u => ({
                            value: u._id,
                            label: u.name || u.email
                          }))
                        ]}
                        value={
                          task.assignedTo?._id
                            ? {
                                value: task.assignedTo._id,
                                label: task.assignedTo.name || task.assignedTo.email
                              }
                            : { value: "", label: "Unassigned" }
                        }
                        onChange={(selected) =>
                          updateTaskField(task._id, {
                            assignedTo: selected?.value || null
                          })
                        }
                        placeholder="Unassigned"
                        isClearable
                        isSearchable
                      />
                    ) : (
                      task.assignedTo?.name ||
                      task.assignedTo?.email ||
                      "Unassigned"
                    )}
                  </td>

                  <td>
                    📷 {task.images?.length || 0} | 🎥 {task.videos?.length || 0} | 📎 {task.attachments?.length || 0}
                  </td>

                  {(canEdit || canDelete) && (
                    <td onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          className="edit-role-btn"
                          onClick={() => navigate(`/tasks/edit/${task._id}`)}
                        >
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          className="delete-role-btn"
                          onClick={() => handleDelete(task._id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}

                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ManageTask;
