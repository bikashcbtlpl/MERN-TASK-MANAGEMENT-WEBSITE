import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, requiredPermissions = [] }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const auth = useAuth();

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/verify");

        const serverUser = res.data.user || {};
        const perms = serverUser.permissions || [];
        const roleFromServer = serverUser.role || {};
        const roleName = (typeof roleFromServer === "string") ? roleFromServer : (roleFromServer.name || null);
        const rolePermissions = Array.isArray(roleFromServer.permissions)
          ? roleFromServer.permissions.map((p) => (typeof p === "string" ? p : p.name))
          : perms;

        const roleObj = { name: roleName, permissions: rolePermissions.map((p) => ({ name: p })) };

        const freshUser = {
          id: serverUser.id,
          name: serverUser.name,
          email: serverUser.email,
          role: roleObj,
          permissions: Array.isArray(perms) ? perms : rolePermissions,
        };

        // 🔥 Update localStorage with normalized user
        localStorage.setItem("user", JSON.stringify(freshUser));

        // update global auth context as well
        if (auth && typeof auth.setUser === 'function') auth.setUser(freshUser);
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
