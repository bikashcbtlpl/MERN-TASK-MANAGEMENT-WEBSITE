import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";

function MyTask() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);

  // loaders
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [completionStatus, setCompletionStatus] = useState("");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);

  /* ================= FETCH TASKS ================= */
  const fetchMyTasks = useCallback(
    async (page = 1, silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setInitialLoading(false); // 🔥 prevent full page reload

        const params = new URLSearchParams({
          page,
          limit: 10,
        });

        if (search) params.append("search", search);
        if (taskStatus) params.append("taskStatus", taskStatus);
        if (completionStatus)
          params.append("completionStatus", completionStatus);

        const res = await axiosInstance.get(
          `/tasks/my?${params.toString()}`
        );

        setTasks(res.data.tasks || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalTasks(res.data.totalTasks || 0);

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
    [search, taskStatus, completionStatus]
  );

  /* LOAD WHEN FILTERS OR PAGE CHANGE */
  useEffect(() => {
    fetchMyTasks(currentPage, true); // 🔥 silent fetch
  }, [fetchMyTasks, currentPage]);

  /* SOCKET REFRESH */
  useEffect(() => {
    const handler = () => fetchMyTasks(currentPage, true);
    socket.on("taskUpdated", handler);
    return () => socket.off("taskUpdated", handler);
  }, [fetchMyTasks, currentPage]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "-";

  const completed = tasks.filter(
    (t) => t.completionStatus === "Completed"
  ).length;

  const active = tasks.filter(
    (t) =>
      t.taskStatus !== "Closed" &&
      t.completionStatus !== "Cancelled"
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

      {/* FILTERS */}
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
          <option value="On Hold">On Hold</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={completionStatus}
          onChange={(e) => {
            setCompletionStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Completion</option>
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

      {/* SUMMARY */}
      <div className="task-summary" style={{ marginBottom: "15px" }}>
        <span>Total: <strong>{totalTasks}</strong></span>
        <span style={{ marginLeft: "15px" }}>
          Active: <strong>{active}</strong>
        </span>
        <span style={{ marginLeft: "15px" }}>
          Completed: <strong>{completed}</strong>
        </span>
      </div>

      {/* TABLE */}
      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Task Status</th>
            <th>Status</th>
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

      {/* PAGINATION */}
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
