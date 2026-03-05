import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";
import { toast } from "react-toastify";
import {
  PageHeader,
  Pagination,
  ActionButtons,
  LoadingSpinner,
  TaskStatusSelect,
  TASK_STATUSES,
  Button,
  Input,
} from "../components/common";
import usePermissions from "../hooks/usePermissions";

function ManageTask() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState("");
  const [isActive, setIsActive] = useState("");

  const { canCreate, canEdit, canDelete, canView } = usePermissions("Task");

  const fetchTasks = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page, limit: 10 });
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
    [search, taskStatus, isActive],
  );

  useEffect(() => {
    if (canView || canCreate || canEdit || canDelete) {
      fetchTasks(currentPage);
    }
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get("/projects");
        setProjects(
          Array.isArray(res.data) ? res.data : res.data.projects || [],
        );
      } catch {
        // ignore
      }
    };
    fetchProjects();
  }, [currentPage, fetchTasks, canView, canCreate, canEdit, canDelete]);

  useEffect(() => {
    const handler = () => fetchTasks(currentPage);
    socket.on("taskUpdated", handler);
    return () => socket.off("taskUpdated", handler);
  }, [currentPage, fetchTasks]);

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

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString() : "-";

  return (
    <div className="manage-role-container">
      <PageHeader
        title="Manage Tasks"
        btnLabel={canCreate ? "+ Create Task" : undefined}
        onBtnClick={() => navigate("/tasks/create")}
      />

      {/* FILTERS */}
      <div className="task-filters">
        <Input
          fullWidth={false}
          placeholder="Search title or description..."
          value={search}
          onChange={(e) => {
            setCurrentPage(1);
            setSearch(e.target.value);
          }}
        />

        {/* Reuse TASK_STATUSES constant for the filter dropdown */}
        <Input
          as="select"
          fullWidth={false}
          value={taskStatus}
          onChange={(e) => {
            setCurrentPage(1);
            setTaskStatus(e.target.value);
          }}
        >
          <option value="">All Task Status</option>
          {TASK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Input>

        <Input
          as="select"
          fullWidth={false}
          value={isActive}
          onChange={(e) => {
            setCurrentPage(1);
            setIsActive(e.target.value);
          }}
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Input>

        <Button
          variant="primary"
          onClick={() => {
            setSearch("");
            setTaskStatus("");
            setIsActive("");
            setCurrentPage(1);
          }}
        >
          Reset
        </Button>
      </div>

      <p>
        Total Tasks: <strong>{totalTasks}</strong>
      </p>

      {loading ? (
        <LoadingSpinner message="Loading tasks..." />
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
                <th>Project</th>
                <th>Files</th>
                {(canEdit || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => (
                <tr
                  key={task._id}
                  onClick={() => navigate(`/tasks/${task._id}`)}
                >
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
                    ) : task.isActive ? (
                      "Active"
                    ) : (
                      "Inactive"
                    )}
                  </td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <TaskStatusSelect
                        value={task.taskStatus}
                        onChange={(e) =>
                          updateTaskField(task._id, {
                            taskStatus: e.target.value,
                          })
                        }
                      />
                    ) : (
                      task.taskStatus
                    )}
                  </td>

                  <td>{formatDate(task.startDate)}</td>
                  <td>{formatDate(task.endDate)}</td>

                  <td onClick={(e) => e.stopPropagation()}>
                    {canEdit ? (
                      <select
                        value={task.project?._id || ""}
                        onChange={(e) =>
                          updateTaskField(task._id, {
                            project: e.target.value || "",
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {projects.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      task.project?.name || "-"
                    )}
                  </td>

                  <td>
                    📷 {task.images?.length || 0} | 🎥{" "}
                    {task.videos?.length || 0} | 📎{" "}
                    {task.attachments?.length || 0}
                  </td>

                  {(canEdit || canDelete) && (
                    <ActionButtons
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onEdit={() => navigate(`/tasks/edit/${task._id}`)}
                      onDelete={() => handleDelete(task._id)}
                    />
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

export default ManageTask;
