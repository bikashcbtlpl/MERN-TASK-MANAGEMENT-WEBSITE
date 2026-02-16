import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";

import Dashboard from "./pages/Dashboard";

// TASKS
import ManageTask from "./pages/ManageTask";
import TaskForm from "./pages/TaskForm";
import TaskDetails from "./pages/TaskDetails";
import MyTask from "./pages/MyTask";

// ROLES
import RoleForm from "./pages/RoleForm";
import ManageRole from "./pages/ManageRole";

// PERMISSIONS
import ManagePermission from "./pages/ManagePermission";

// USERS
import ManageUser from "./pages/ManageUser";

import Settings from "./pages/Settings";

/* 🔥 TOASTIFY IMPORTS */
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>

      {/* 🔥 GLOBAL TOAST CONTAINER */}
      <ToastContainer
        position="top-right"
        autoClose={3000}          // disappears after 3 sec
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        pauseOnFocusLoss
        draggable
        limit={3}                 // prevents infinite stacking
        theme="colored"
      />

      <Routes>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >

          {/* ================= DASHBOARD ================= */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* ================= TASKS ================= */}

          <Route
            path="tasks"
            element={
              <ProtectedRoute
                requiredPermissions={[
                  "Create Task",
                  "Edit Task",
                  "Delete Task",
                ]}
              >
                <ManageTask />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/create"
            element={
              <ProtectedRoute requiredPermissions={["Create Task"]}>
                <TaskForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/edit/:id"
            element={
              <ProtectedRoute requiredPermissions={["Edit Task"]}>
                <TaskForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/:id"
            element={
              <ProtectedRoute requiredPermissions={["View Task"]}>
                <TaskDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="my-tasks"
            element={
              <ProtectedRoute requiredPermissions={["View Task"]}>
                <MyTask />
              </ProtectedRoute>
            }
          />

          {/* ================= ROLES ================= */}

          <Route
            path="roles"
            element={
              <ProtectedRoute
                requiredPermissions={[
                  "View Role",
                  "Create Role",
                  "Edit Role",
                  "Delete Role",
                ]}
              >
                <ManageRole />
              </ProtectedRoute>
            }
          />

          <Route
            path="roles/create"
            element={
              <ProtectedRoute requiredPermissions={["Create Role"]}>
                <RoleForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="roles/edit/:roleName"
            element={
              <ProtectedRoute requiredPermissions={["Edit Role"]}>
                <RoleForm />
              </ProtectedRoute>
            }
          />

          {/* ================= PERMISSIONS ================= */}

          <Route
            path="permissions"
            element={
              <ProtectedRoute
                requiredPermissions={[
                  "View Permission",
                  "Create Permission",
                  "Edit Permission",
                  "Delete Permission",
                ]}
              >
                <ManagePermission />
              </ProtectedRoute>
            }
          />

          {/* ================= USERS ================= */}

          <Route
            path="users"
            element={
              <ProtectedRoute
                requiredPermissions={[
                  "View User",
                  "Create User",
                  "Edit User",
                  "Delete User",
                ]}
              >
                <ManageUser />
              </ProtectedRoute>
            }
          />

          {/* ================= SETTINGS ================= */}
          <Route path="settings" element={<Settings />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
