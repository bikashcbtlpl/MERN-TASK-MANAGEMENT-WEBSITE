import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const loginTime = localStorage.getItem("loginTime");
      const user = JSON.parse(localStorage.getItem("user"));

      if (!loginTime || !user) return;

      const sessionMinutes = user.sessionTimeout || 30; // default 30 min
      const timeoutMs = sessionMinutes * 60 * 1000;

      const currentTime = Date.now();

      if (currentTime - parseInt(loginTime) > timeoutMs) {
        localStorage.clear();
        alert("Session expired. Please login again.");
        navigate("/login");
      }
    };

    // Check every 1 minute
    const interval = setInterval(checkSession, 60000);

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-section">
        <Topbar />
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
