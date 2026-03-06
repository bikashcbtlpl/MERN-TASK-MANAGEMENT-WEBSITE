import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";
import socket from "../../socket";
import { PERMS, can as canPermission } from "../../permissions/can";
import { useAuth } from "../../context/AuthContext";
import {
  PageHeader,
  Pagination,
  LoadingSpinner,
  TaskStatusSelect,
  TASK_STATUSES,
  StatusBadge,
  Button,
  Input,
} from "../../components/common";

function MyTask() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const normalizeProjectSelection = (value) => {
    const v = String(value || "").trim();
    const blocked = ["", "all", "all projects", "null", "undefined"];
    return blocked.includes(v.toLowerCase()) ? "" : v;
  };

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
        const selectedProject = normalizeProjectSelection(
          localStorage.getItem("selectedProject"),
        );
        if (selectedProject) params.append("project", selectedProject);
        if (search) params.append("search", search);
        if (taskStatus) params.append("taskStatus", taskStatus);

        const res = await axiosInstance.get(`/tasks/my?${params.toString()}`);
        const serverTasks = res.data.tasks || [];

        setTasks(serverTasks);
        setTotalPages(res.data.totalPages || 1);
        setTotalTasks(res.data.totalTasks || 0);
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
    window.addEventListener("projectSelectionChanged", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("projectSelectionChanged", handler);
    };
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
  const shouldShowPagination = totalPages > 1;

  if (initialLoading) return <LoadingSpinner message="Loading your tasks..." />;

  return (
    <div className="manage-role-container">
      <PageHeader title="My Tasks">
        <div className="header-search-wrapper">
          <span className="search-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="header-search"
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </PageHeader>

      <div>
        {refreshing && (
          <span style={{ fontSize: "13px", color: "#777" }}>Updating...</span>
        )}
      </div>

      {/* FILTERS */}
      <div className="task-filters">
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
            <th>Project</th>
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

                <td onClick={(e) => e.stopPropagation()}>
                  {user && (task.canEditStatus || canPermission(user, PERMS.TASK_EDIT)) ? (
                    <TaskStatusSelect
                      value={task.taskStatus}
                      onClick={(e) => e.stopPropagation()}
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
                <td>{task.project?.name || "-"}</td>

                <td>
                  📷 {task.images?.length || 0} | 🎥 {task.videos?.length || 0}{" "}
                  | 📎 {task.attachments?.length || 0}
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

      {shouldShowPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

export default MyTask;
