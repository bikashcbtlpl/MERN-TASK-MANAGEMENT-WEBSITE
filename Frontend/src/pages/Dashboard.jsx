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
    // Ensure socket connected
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
        {(user?.role === "Super Admin" || user?.role === "Admin") && (
          <div className="dashboard-card">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        )}

        {/* Everyone sees these */}
        <div className="dashboard-card">
          <h3>Total Tasks</h3>
          <p>{stats.totalTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>Completed Tasks</h3>
          <p>{stats.completedTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>Active Tasks</h3>
          <p>{stats.activeTasks}</p>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
