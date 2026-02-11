import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

function ManageTask() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "In Progress",
    assignedTo: "",
  });

  // 🔥 GET USER PERMISSIONS
  const user = JSON.parse(localStorage.getItem("user"));
  const permissions = user?.permissions || [];

  const canView = permissions.includes("View Task");
  const canCreate = permissions.includes("Create Task");
  const canEdit = permissions.includes("Edit Task");
  const canDelete = permissions.includes("Delete Task");

  useEffect(() => {
    if (canView || canCreate || canEdit || canDelete) {
      fetchTasks();
      fetchUsers();
    }
  }, []);

  const fetchTasks = async () => {
    const res = await axiosInstance.get("/tasks");
    setTasks(res.data);
  };

  const fetchUsers = async () => {
    const res = await axiosInstance.get("/users");
    setUsers(res.data);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: "",
      description: "",
      status: "In Progress",
      assignedTo: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      assignedTo: task.assignedTo?._id || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingTask) {
      await axiosInstance.put(`/tasks/${editingTask._id}`, formData);
    } else {
      await axiosInstance.post("/tasks", formData);
    }

    fetchTasks();
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    await axiosInstance.delete(`/tasks/${id}`);
    fetchTasks();
  };

  return (
    <div className="manage-role-container">
      <div className="manage-role-header">
        <h2>Manage Task</h2>

        {/* 🔥 CREATE BUTTON BASED ON PERMISSION */}
        {canCreate && (
          <button
            className="create-role-btn"
            onClick={openCreateModal}
          >
            + Create Task
          </button>
        )}
      </div>

      <p>
        Total Tasks: <strong>{tasks.length}</strong>
      </p>

      <table className="role-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Description</th>
            <th>Status</th>
            <th>Assigned To</th>

            {(canEdit || canDelete) && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {tasks.map((task, index) => (
            <tr key={task._id}>
              <td>{index + 1}</td>
              <td>{task.title}</td>
              <td>{task.description}</td>
              <td>
                <span
                  className={
                    task.status === "Completed"
                      ? "role-status active"
                      : "role-status inactive"
                  }
                >
                  {task.status}
                </span>
              </td>
              <td>{task.assignedTo?.email || "Unassigned"}</td>

              {(canEdit || canDelete) && (
                <td>
                  {/* 🔥 EDIT BUTTON */}
                  {canEdit && (
                    <button
                      className="edit-role-btn"
                      onClick={() => openEditModal(task)}
                    >
                      Edit
                    </button>
                  )}

                  {/* 🔥 DELETE BUTTON */}
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

      {/* 🔥 MODAL (Only if Create or Edit allowed) */}
      {isModalOpen && (canCreate || canEdit) && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>
              {editingTask ? "Edit Task" : "Create Task"}
            </h3>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Assign User</label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assignedTo: e.target.value,
                    })
                  }
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option
                      key={user._id}
                      value={user._id}
                    >
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="In Progress">
                    In Progress
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                </select>
              </div>

              <div className="modal-buttons">
                <button type="submit" className="save-btn">
                  {editingTask ? "Update" : "Create"}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageTask;
