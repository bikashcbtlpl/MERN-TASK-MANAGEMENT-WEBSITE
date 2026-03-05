import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";
import {
  Pagination,
  LoadingSpinner,
  TaskStatusSelect,
  TASK_STATUSES,
  StatusBadge,
  Button,
  Input,
} from "../components/common";

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
        else setInitialLoading(true);

        const params = new URLSearchParams({ page, limit: 10 });
        const selectedProject =
          localStorage.getItem("selectedProject") || "";
        if (selectedProject) params.append("project", selectedProject);
        if (search) params.append("search", search);
        if (taskStatus) params.append("taskStatus", taskStatus);

        const res = await axiosInstance.get(`/tasks/my?${params.toString()}`);
        const activeTasks = (res.data.tasks || []).filter(
          (t) => t.isActive !== false,
        );

        setTasks(activeTasks);
        setTotalPages(res.data.totalPages || 1);
        setTotalTasks(activeTasks.length);
      } catch (error) {
        console.log("Error fetching tasks:", error.response?.data?.message);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [search, taskStatus],
  );

  useEffect(() => {
    fetchMyTasks(currentPage, true);
  }, [fetchMyTasks, currentPage]);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const getCurrentUserId = () => currentUser?._id || currentUser?.id || null;
  const getAssigneeId = (task) =>
    task.assignedTo?._id || task.assignedTo?.id || null;

  const updateStatus = async (taskId, status) => {
    try {
      setRefreshing(true);
      await axiosInstance.put(`/tasks/${taskId}`, { taskStatus: status });
      await fetchMyTasks(currentPage, true);
    } catch (err) {
      console.error("Error updating status", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handler = () => fetchMyTasks(1, true);
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [fetchMyTasks]);

  useEffect(() => {
    const handler = () => fetchMyTasks(currentPage, true);
    socket.on("taskUpdated", handler);
    return () => socket.off("taskUpdated", handler);
  }, [fetchMyTasks, currentPage]);

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "-";

  const completed = tasks.filter((t) => t.taskStatus === "Completed").length;
  const active = tasks.filter(
    (t) => t.taskStatus !== "Closed" && t.taskStatus !== "Cancelled",
  ).length;

  if (initialLoading) return <LoadingSpinner message="Loading your tasks..." />;

  return (
    <div className="manage-role-container">
      <div>
        {refreshing && (
          <span style={{ fontSize: "13px", color: "#777" }}>Updating...</span>
        )}
      </div>

      {/* FILTERS */}
      <div className="task-filters">
        <Input
          fullWidth={false}
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />

        <Input
          as="select"
          fullWidth={false}
          value={taskStatus}
          onChange={(e) => {
            setTaskStatus(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">All Task Status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Input>

        <Button
          variant="primary"
          onClick={() => {
            setSearch("");
            setTaskStatus("");
            setCurrentPage(1);
          }}
        >
          Reset
        </Button>
      </div>

      <div className="task-summary" style={{ marginBottom: "15px" }}>
        <span>
          Total: <strong>{totalTasks}</strong>
        </span>
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

                <td>
                  {currentUser &&
                    (getCurrentUserId() === getAssigneeId(task) ||
                      currentUser.permissions?.includes("Edit Task")) ? (
                    <TaskStatusSelect
                      value={task.taskStatus}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateStatus(task._id, e.target.value);
                      }}
                    />
                  ) : (
                    <StatusBadge status={task.taskStatus} type="task" />
                  )}
                </td>

                <td>{formatDate(task.startDate)}</td>
                <td>{formatDate(task.endDate)}</td>

                <td>
                  📷 {task.images?.length || 0} | 🎥{" "}
                  {task.videos?.length || 0} | 📎{" "}
                  {task.attachments?.length || 0}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: "center" }}>
                No tasks assigned
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}

export default MyTask;
