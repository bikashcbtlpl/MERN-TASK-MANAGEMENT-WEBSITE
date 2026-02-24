import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import socket from "../socket";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // ================= FETCH STATS =================
  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/dashboard");
      setStats(res.data);
      // If backend didn't scope for non-admin users correctly, fetch scoped counts
      const userRole = user?.role?.name;
      const isAdmin = userRole === "Super Admin" || userRole === "Admin";

      if (!isAdmin) {
        try {
          const params = { page: 1, limit: 10 };
          const selectedProject = localStorage.getItem("selectedProject") || "";
          if (selectedProject) params.project = selectedProject;

          const myRes = await axiosInstance.get("/tasks/my", { params });
          const myTasks = (myRes.data.tasks || []).filter((t) => t.isActive !== false);

          const total = myTasks.length;
          const completed = myTasks.filter((t) => t.taskStatus === "Completed").length;
          const active = myTasks.filter((t) => t.taskStatus !== "Closed" && t.taskStatus !== "Cancelled").length;

          setStats({
            totalUsers: res.data.totalUsers || 0,
            totalTasks: total,
            completedTasks: completed,
            activeTasks: active,
          });
        } catch (err) {
          console.log("Error fetching user-scoped task counts", err);
        }
      }
    } catch (error) {
      console.log("Dashboard Error:", error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ================= SOCKET REALTIME UPDATE =================
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleUpdate = () => {
      fetchStats();
    };

    socket.on("taskUpdated", handleUpdate);

    return () => {
      socket.off("taskUpdated", handleUpdate);
    };
  }, [fetchStats]);

  // ================= LOADING STATES =================
  if (loading) return <div style={{ padding: "20px" }}>Loading dashboard...</div>;
  if (!stats) return <div style={{ padding: "20px" }}>No dashboard data</div>;

  return (
    <div className="dashboard-container">
      <div className="card-container">

        {/* Admin only */}
        {(user?.role?.name === "Super Admin" || user?.role?.name === "Admin") && (
          <div className="dashboard-card">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        )}

        {/* Tasks: show global labels for admins, user-specific labels otherwise */}
        <div className="dashboard-card">
          <h3>{(user?.role?.name === "Super Admin" || user?.role?.name === "Admin") ? 'Total Tasks' : 'Your Tasks'}</h3>
          <p>{stats.totalTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>{(user?.role?.name === "Super Admin" || user?.role?.name === "Admin") ? 'Completed Tasks' : 'Your Completed Tasks'}</h3>
          <p>{stats.completedTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>{(user?.role?.name === "Super Admin" || user?.role?.name === "Admin") ? 'Active Tasks' : 'Your Active Tasks'}</h3>
          <p>{stats.activeTasks}</p>
        </div>

      
      </div>
    </div>
  );
}

export default Dashboard;
