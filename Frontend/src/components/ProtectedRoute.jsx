import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, requiredPermissions }) {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    return <Navigate to="/login" />;
  }

  // 🔑 Permission check (if required)
  if (requiredPermissions && requiredPermissions.length > 0) {
    const permissions = user?.permissions || [];

    const hasAccess = requiredPermissions.some((perm) =>
      permissions.includes(perm)
    );

    if (!hasAccess) {
      return <Navigate to="/dashboard" />;
    }
  }

  return children;
}

export default ProtectedRoute;
