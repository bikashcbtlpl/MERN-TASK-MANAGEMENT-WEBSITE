import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

function MyTask() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    try {
      const res = await axiosInstance.get("/tasks/my");
      console.log("MY TASK API RESPONSE:", res.data);
      setTasks(res.data || []);
    } catch (error) {
      console.log("Error fetching tasks:", error.response?.data?.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const completed = tasks.filter(
    (t) => t.status === "Completed"
  ).length;

  const active = tasks.filter(
    (t) => t.status === "In Progress"
  ).length;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="manage-role-container">
      <h2>My Tasks</h2>

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
          </tr>
        </thead>

        <tbody>
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
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
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
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
