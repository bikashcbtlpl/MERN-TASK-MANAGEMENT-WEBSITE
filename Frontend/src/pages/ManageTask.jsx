import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";
import { toast } from "react-toastify";

function ManageTask() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  // 🔎 SEARCH + FILTER STATE
  const [search, setSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [completionStatus, setCompletionStatus] = useState("");

  // 🔐 Permissions
  const user = JSON.parse(localStorage.getItem("user"));
  const permissions = user?.permissions || [];

  const canView = permissions.includes("View Task");
  const canCreate = permissions.includes("Create Task");
  const canEdit = permissions.includes("Edit Task");
  const canDelete = permissions.includes("Delete Task");

  // ================= FETCH TASKS =================
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
        if (completionStatus)
          params.append("completionStatus", completionStatus);

        const res = await axiosInstance.get(`/tasks?${params.toString()}`);

        setTasks(res.data.tasks || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalTasks(res.data.totalTasks || 0);

        if (page > 1 && res.data.tasks.length === 0) {
          setCurrentPage(page - 1);
        }
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Error fetching tasks"
        );
      } finally {
        setLoading(false);
      }
    },
    [search, taskStatus, completionStatus]
  );

  useEffect(() => {
    if (canView || canCreate || canEdit || canDelete) {
      fetchTasks(currentPage);
    }
  }, [currentPage, fetchTasks]);

  // ================= SOCKET =================
  useEffect(() => {
    const handleUpdate = () => fetchTasks(currentPage);
    socket.on("taskUpdated", handleUpdate);
    return () => socket.off("taskUpdated", handleUpdate);
  }, [currentPage, fetchTasks]);

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;

    try {
      await axiosInstance.delete(`/tasks/${id}`);
      toast.success("Task deleted successfully");
      fetchTasks(currentPage);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Error deleting task"
      );
    }
  };

  // ================= FORMAT DATE =================
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="manage-role-container">
      {/* HEADER */}
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

      {/* 🔎 SEARCH + FILTER BAR */}
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
          <option value="On Hold">On Hold</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={completionStatus}
          onChange={(e) => {
            setCurrentPage(1);
            setCompletionStatus(e.target.value);
          }}
        >
          <option value="">Status</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <button
          onClick={() => {
            setSearch("");
            setTaskStatus("");
            setCompletionStatus("");
            setCurrentPage(1);
          }}
        >
          Reset
        </button>
      </div>

      <p>
        Total Tasks: <strong>{totalTasks}</strong>
      </p>

      {loading ? (
        <div style={{ padding: "20px" }}>Loading tasks...</div>
      ) : (
        <>
          <table className="role-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Task Status</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th>Assigned</th>
                <th>Files</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {tasks.length > 0 ? (
                tasks.map((task, index) => (
                  <tr
                    key={task._id}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/tasks/${task._id}`)}
                  >
                    <td>{(currentPage - 1) * 10 + index + 1}</td>

                    <td>{task.title}</td>

                    <td>
                      <span className="role-status inactive">
                        {task.taskStatus}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          task.completionStatus === "Completed"
                            ? "role-status active"
                            : "role-status inactive"
                        }
                      >
                        {task.completionStatus}
                      </span>
                    </td>

                    <td>{formatDate(task.startDate)}</td>
                    <td>{formatDate(task.endDate)}</td>

                    <td>{task.assignedTo?.email || "Unassigned"}</td>

                    <td>
                      📷 {task.images?.length || 0} | 🎥 {task.videos?.length || 0} | 📎 {task.attachments?.length || 0}
                    </td>

                    {(canEdit || canDelete) && (
                      <td onClick={(e) => e.stopPropagation()}>
                        {canEdit && (
                          <button
                            className="edit-role-btn"
                            onClick={() =>
                              navigate(`/tasks/edit/${task._id}`)
                            }
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
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center" }}>
                    No tasks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Prev
              </button>

              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ManageTask;
