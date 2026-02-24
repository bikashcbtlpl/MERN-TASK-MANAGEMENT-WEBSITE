import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, setUser } = useAuth();
  const dropdownRef = useRef();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(() => {
    return localStorage.getItem("selectedProject") || "";
  });

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

  /* ================= LOAD USER ================= */

  useEffect(() => {
    const loadUser = () => {
      // projects will be fetched below via API using authenticated cookie
    };

    loadUser();
    const handleStorage = () => setSelectedProject(localStorage.getItem("selectedProject") || "");
    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axiosInstance.get("/projects");
        const data = res.data || {};
        const list = data.projects || data;
        setProjects(Array.isArray(list) ? list : []);
      } catch (err) {
        console.log("Error loading projects for topbar:", err);
      }
    };

    if (user) fetchProjects();
  }, [user]);

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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= AVATAR INITIAL ================= */

  const getInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <div className="topbar">
      <div className="page-title">
        {formatPageTitle()}
      </div>

      <div className="account-section" ref={dropdownRef}>
        <div
          className="account-name"
          onClick={() => setOpen(!open)}
        >
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {/* Project selector for team projects (moved left of account) */}
              {projects.length > 0 && (
                <select
                  value={selectedProject}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedProject(val);
                    localStorage.setItem("selectedProject", val);
                    // fire storage event for other tabs
                    window.dispatchEvent(new Event('storage'));
                    // navigate to My Task so user sees filtered tasks
                    navigate('/tasks');
                  }}
                  style={{ marginRight: 4, padding: 6, borderRadius: 4 }}
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              )}

              <div className="avatar-circle">
                {getInitial()}
              </div>

              <span>
                {user?.name || user?.email?.split("@")[0] || "User"}
              </span>
            </div>
        </div>

        {open && (
          <div className="profile-dropdown">
            <div className="avatar-circle large">
              {getInitial()}
            </div>

            <h4>{user?.name || user?.email}</h4>
            <p>{user?.role?.name || "No Role"}</p>

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Topbar;
