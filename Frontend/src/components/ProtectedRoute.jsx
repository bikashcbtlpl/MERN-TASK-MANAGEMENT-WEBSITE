import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function ProtectedRoute({ children, requiredPermissions = [] }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/verify");

        const freshUser = res.data.user;

        // 🔥 Update localStorage with fresh permissions
        localStorage.setItem("user", JSON.stringify(freshUser));

        setUser(freshUser);
      } catch (error) {
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredPermissions.length > 0) {
    const hasAccess = requiredPermissions.some((perm) =>
      user.permissions.includes(perm)
    );

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
