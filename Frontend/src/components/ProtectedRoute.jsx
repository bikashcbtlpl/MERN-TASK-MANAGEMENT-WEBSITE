import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

function ProtectedRoute({ children, requiredPermissions }) {
  const [isAuth, setIsAuth] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        await axiosInstance.get("/auth/verify");

        const storedUser = JSON.parse(localStorage.getItem("user"));
        setUser(storedUser);
        setIsAuth(true);
      } catch (error) {
        localStorage.removeItem("user");
        setIsAuth(false);
      }
    };

    verifyUser();
  }, []);

  // While checking auth
  if (isAuth === null) {
    return <div>Loading...</div>;
  }

  // Not authenticated
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  // Permission check
  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissions = user?.permissions || [];

    const hasAccess = requiredPermissions.some((perm) =>
      permissions.includes(perm)
    );

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
