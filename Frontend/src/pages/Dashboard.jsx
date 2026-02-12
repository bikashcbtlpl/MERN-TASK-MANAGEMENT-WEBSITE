import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get("/dashboard");
      setStats(res.data);
    } catch (error) {
      console.log("Dashboard Error:", error.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!stats) return <div>No Data</div>;

  return (
    <div className="dashboard-container">
      <div className="card-container">

        {user?.role === "Super Admin" || user?.role === "Admin" ? (
          <div className="dashboard-card">
            <h3>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        ) : null}


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
