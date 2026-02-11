import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import ManageTask from "./pages/ManageTask";
import ManageRole from "./pages/ManageRole";
import ManagePermission from "./pages/ManagePermission";
import ManageUser from "./pages/ManageUser";
import Settings from "./pages/Settings";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />

          <Route
            path="tasks"
            element={
              <ProtectedRoute requiredPermissions={[
                "View Task",
                "Create Task",
                "Edit Task",
                "Delete Task",
              ]}>
                <ManageTask />
              </ProtectedRoute>
            }
          />

          <Route
            path="roles"
            element={
              <ProtectedRoute requiredPermissions={[
                "Create Role",
                "Edit Role",
                "Delete Role",
              ]}>
                <ManageRole />
              </ProtectedRoute>
            }
          />

          <Route
            path="permissions"
            element={
              <ProtectedRoute requiredPermissions={[
                "Create Permission",
                "Edit Permission",
                "Delete Permission",
              ]}>
                <ManagePermission />
              </ProtectedRoute>
            }
          />

          <Route
            path="users"
            element={
              <ProtectedRoute requiredPermissions={[
                "Create User",
                "Edit User",
                "Delete User",
              ]}>
                <ManageUser />
              </ProtectedRoute>
            }
          />

          <Route path="settings" element={<Settings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
