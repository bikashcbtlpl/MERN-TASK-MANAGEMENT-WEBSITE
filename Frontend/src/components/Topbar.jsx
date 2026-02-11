import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";

function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef();

  const pageName =
    location.pathname === "/dashboard"
      ? "Dashboard"
      : location.pathname.replace("/", "");

  // Load user
  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    };

    loadUser();
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  // Logout
    const handleLogout = async () => {
      try {
        await axiosInstance.post("/auth/logout");
        localStorage.removeItem("user");
        navigate("/login");
      } catch (error) {
        console.log("Logout failed:", error);
      }
    };


  // Close dropdown
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

  // 🔥 Get First Letter
  const getInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <div className="topbar">
      <div className="page-title">{pageName.toUpperCase()}</div>

      <div className="account-section" ref={dropdownRef}>
        <div
          className="account-name"
          onClick={() => setOpen(!open)}
        >
          <div className="avatar-circle">
            {getInitial()}
          </div>

          <span>
            {user?.name || user?.email?.split("@")[0] || "User"}
          </span>
        </div>

        {open && (
          <div className="profile-dropdown">
            <div className="avatar-circle large">
              {getInitial()}
            </div>

            <h4>{user?.name || user?.email}</h4>
            <p>{user?.role || "No Role"}</p>

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
