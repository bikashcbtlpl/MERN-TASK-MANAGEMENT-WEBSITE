import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";

function MyTask() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  const fetchMyTasks = useCallback(
    async (page = 1, silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setInitialLoading(false);

        const params = new URLSearchParams({
          page,
          limit: 10,
        });

        if (search) params.append("search", search);
        if (taskStatus) params.append("taskStatus", taskStatus);

        const res = await axiosInstance.get(
          `/tasks/my?${params.toString()}`
        );

        const activeTasks = (res.data.tasks || []).filter(
          (t) => t.isActive !== false
        );

        setTasks(activeTasks);
        setTotalPages(res.data.totalPages || 1);
        setTotalTasks(activeTasks.length);
      } catch (error) {
        console.log(
          "Error fetching tasks:",
          error.response?.data?.message
        );
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [search, taskStatus]
  );

  useEffect(() => {
    fetchMyTasks(currentPage, true);
  }, [fetchMyTasks, currentPage]);

  useEffect(() => {
    const handler = () => fetchMyTasks(currentPage, true);
    socket.on("taskUpdated", handler);
    return () => socket.off("taskUpdated", handler);
  }, [fetchMyTasks, currentPage]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "-";

  const completed = tasks.filter(
    (t) => t.taskStatus === "Completed"
  ).length;

  const active = tasks.filter(
    (t) =>
      t.taskStatus !== "Closed" &&
      t.taskStatus !== "Cancelled"
  ).length;

  if (initialLoading) return <div>Loading...</div>;

  return (
    <div className="manage-role-container">
      <div>
        {refreshing && (
          <span style={{ fontSize: "13px", color: "#777" }}>
            Updating...
          </span>
        )}
      </div>

      <div className="task-filters">
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <select
          value={taskStatus}
          onChange={(e) => {
            setTaskStatus(e.target.value);
            setCurrentPage(1);
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

        <button
          onClick={() => {
            setSearch("");
            setTaskStatus("");
            setCurrentPage(1);
          }}
        >
          Reset
        </button>
      </div>

      <div className="task-summary" style={{ marginBottom: "15px" }}>
        <span>Total: <strong>{totalTasks}</strong></span>
        <span style={{ marginLeft: "15px" }}>
          Active: <strong>{active}</strong>
        </span>
        <span style={{ marginLeft: "15px" }}>
          Completed: <strong>{completed}</strong>
        </span>
      </div>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Task Status</th>
            <th>Start</th>
            <th>End</th>
            <th>Files</th>
          </tr>
        </thead>

        <tbody>
          {tasks.length ? (
            tasks.map((task, index) => (
              <tr
                key={task._id}
                onClick={() => navigate(`/tasks/${task._id}`)}
                style={{ cursor: "pointer" }}
              >
                <td>{(currentPage - 1) * 10 + index + 1}</td>
                <td>{task.title}</td>

                {/* ✅ FIXED STATUS COLOR */}
                <td>
                  <span
                    className={`status-badge status-${task.taskStatus
                      ?.toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {task.taskStatus}
                  </span>
                </td>

                <td>{formatDate(task.startDate)}</td>
                <td>{formatDate(task.endDate)}</td>

                <td>
                  📷 {task.images?.length || 0} | 🎥 {task.videos?.length || 0} | 📎 {task.attachments?.length || 0}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center" }}>
                No tasks assigned
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </button>

          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default MyTask;
