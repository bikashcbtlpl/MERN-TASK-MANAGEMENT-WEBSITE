import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get("/dashboard", {
        withCredentials: true, 
      });

      setStats(res.data);
    } catch (error) {
      console.log("Dashboard Error:", error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard-container">
      <div className="card-container">
        <div className="dashboard-card">
          <h3>Total Users</h3>
          <p>{stats.totalUsers}</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Tasks</h3>
          <p>{stats.totalTasks}</p>
        </div>

        <div className="dashboard-card">
          <h3>Completed Tasks</h3>
          <p>{stats.completedTasks}</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
