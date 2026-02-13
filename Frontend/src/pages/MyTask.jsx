import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";

function MyTask() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ================= FETCH TASKS =================
  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);

      const res = await axiosInstance.get("/tasks/my");
      setTasks(res.data || []);
    } catch (error) {
      console.log(
        "Error fetching tasks:",
        error.response?.data?.message
      );
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  // ================= SOCKET LISTENER =================
  useEffect(() => {
    socket.on("taskUpdated", fetchMyTasks);

    return () => {
      socket.off("taskUpdated", fetchMyTasks);
    };
  }, [fetchMyTasks]);

  // ================= FORMAT DATE =================
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
  };

  // ================= STATS =================
  const completed = tasks.filter(
    (t) => t.completionStatus === "Completed"
  ).length;

  const active = tasks.filter(
    (t) => t.taskStatus === "In Progress"
  ).length;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="manage-role-container">
      <div className="manage-role-header">
        <h2>My Tasks</h2>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="task-summary" style={{ marginBottom: "15px" }}>
            <span>Total: <strong>{tasks.length}</strong></span>
            <span style={{ marginLeft: "15px" }}>
              Active: <strong>{active}</strong>
            </span>
            <span style={{ marginLeft: "15px" }}>
              Completed: <strong>{completed}</strong>
            </span>
          </div>

      {/* ================= TASK TABLE ================= */}
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
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <tr
                key={task._id}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/tasks/${task._id}`)}
              >
                <td>{index + 1}</td>

                <td>{task.title}</td>

                {/* TASK STATUS */}
                <td>
                  <span className="role-status inactive">
                    {task.taskStatus}
                  </span>
                </td>

                {/* COMPLETION STATUS */}
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

                {/* ATTACHMENT COUNT */}
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
    </div>
  );
}

export default MyTask;
