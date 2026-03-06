import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { canAny } from "../permissions/can";

function ProtectedRoute({ children, requiredPermissions = [] }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (requiredPermissions.length > 0) {
    const hasAccess = canAny(user, requiredPermissions);

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
