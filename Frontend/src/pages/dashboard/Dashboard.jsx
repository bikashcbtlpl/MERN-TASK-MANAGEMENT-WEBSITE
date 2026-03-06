import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import socket from "../../socket";
import { LoadingSpinner } from "../../components/common";
import { useAuth } from "../../context/AuthContext";
import { isAdminUser } from "../../permissions/can";

function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = isAdminUser(user);

  const fetchStats = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/dashboard");
      setStats(res.data);

      if (!isAdmin) {
        try {
          const params = { page: 1, limit: 10 };
          const selectedProject = localStorage.getItem("selectedProject") || "";
          if (selectedProject) params.project = selectedProject;

          const myRes = await axiosInstance.get("/tasks/my", { params });
          const myTasks = (myRes.data.tasks || []).filter(
            (t) => t.isActive !== false,
          );

          setStats({
            totalUsers: res.data.totalUsers || 0,
            totalTasks: myTasks.length,
            completedTasks: myTasks.filter((t) => t.taskStatus === "Completed")
              .length,
            activeTasks: myTasks.filter(
              (t) => t.taskStatus !== "Closed" && t.taskStatus !== "Cancelled",
            ).length,
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
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && user) fetchStats();
  }, [fetchStats, authLoading, user]);

  useEffect(() => {
    const handler = () => fetchStats();
    window.addEventListener("projectSelectionChanged", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("projectSelectionChanged", handler);
      window.removeEventListener("storage", handler);
    };
  }, [fetchStats]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleUpdate = () => fetchStats();
    socket.on("taskUpdated", handleUpdate);
    return () => socket.off("taskUpdated", handleUpdate);
  }, [fetchStats]);

  if (authLoading || loading)
    return <LoadingSpinner message="Loading dashboard..." />;
  if (!stats) return <LoadingSpinner message="No dashboard data" />;

  return (
    <div className="dashboard-container">
      <div className="card-container">
        {isAdmin && (
          <div className="dashboard-card">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        )}

        <div className="dashboard-card">
          <h3>{isAdmin ? "Total Tasks" : "Your Tasks"}</h3>
          <p>{stats.totalTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>{isAdmin ? "Completed Tasks" : "Your Completed Tasks"}</h3>
          <p>{stats.completedTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>{isAdmin ? "Active Tasks" : "Your Active Tasks"}</h3>
          <p>{stats.activeTasks}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
