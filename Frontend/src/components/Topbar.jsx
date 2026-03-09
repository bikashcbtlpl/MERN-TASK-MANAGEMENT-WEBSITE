import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useProject } from "../context/ProjectContext";
import { Button } from "./common";

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { projects, selectedProject, setSelectedProject } = useProject();
  const dropdownRef = useRef();

  /* ================= PAGE TITLE LOGIC ================= */
  const formatPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard";
    if (path === "/roles") return "Roles";
    if (path === "/roles/create") return "Role / Create";
    if (path.startsWith("/roles/edit/")) {
      const roleName = decodeURIComponent(path.split("/")[3] || "");
      return `Role / Edit / ${roleName}`;
    }
    if (path === "/tasks") return "Tasks";
    if (path === "/permissions") return "Permissions";
    if (path === "/users") return "Users";
    if (path === "/settings") return "Settings";
    return path.replace("/", "").toUpperCase();
  };

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.log("Logout failed:", error);
    }
  };

  /* ================= CLOSE DROPDOWN ================= */
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= AVATAR INITIAL ================= */
  const getInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const getDisplayRoleName = () => {
    const roleName = user?.role?.name || "";
    if (roleName === "Super Admin") return "Admin";
    return roleName || "No Role";
  };

  return (
    <div className="topbar">
      <div className="page-title">{formatPageTitle()}</div>

      <div className="account-section" ref={dropdownRef}>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        <div className="account-name" onClick={() => setOpen(!open)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Project selector — saves to server via ProjectContext */}
            {projects.length > 0 && (
              <select
                value={selectedProject}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedProject(e.target.value);
                }}
                style={{ marginRight: 4, padding: 6, borderRadius: 4 }}
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id || p.id || p.name} value={p._id || p.id || p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <div className="avatar-circle">{getInitial()}</div>
            <span>{user?.name || user?.email?.split("@")[0] || "User"}</span>
          </div>
        </div>

        {open && (
          <div className="profile-dropdown">
            <div className="avatar-circle large">{getInitial()}</div>
            <h4>{user?.name || user?.email}</h4>
            <p>{getDisplayRoleName()}</p>
            <Button variant="danger" fullWidth onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Topbar;
