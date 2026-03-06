import ManageProject from "./pages/projects/ManageProject";
import ProjectFormPage from "./pages/projects/ProjectFormPage";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";

import Dashboard from "./pages/dashboard/Dashboard";

// TASKS
import ManageTask from "./pages/tasks/ManageTask";
import TaskForm from "./pages/tasks/TaskForm";
import TaskDetails from "./pages/tasks/TaskDetails";
import MyTask from "./pages/tasks/MyTask";

// ROLES
import RoleForm from "./pages/roles/RoleForm";
import ManageRole from "./pages/roles/ManageRole";

// PERMISSIONS
import ManagePermission from "./pages/permissions/ManagePermission";
import Documents from "./pages/documents/DocumentsPage";
import { PERMS, PERM_GROUPS } from "./permissions/can";

// USERS
import ManageUser from "./pages/users/ManageUser";

import Settings from "./pages/settings/Settings";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
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
          {/* ================= PROJECTS ================= */}
          <Route path="projects" element={<ManageProject />} />
          <Route
            path="projects/create"
            element={<ProjectFormPage mode="create" />}
          />
          <Route
            path="projects/edit/:id"
            element={<ProjectFormPage mode="edit" />}
          />

          {/* ================= DASHBOARD ================= */}
          <Route path="dashboard" element={<Dashboard />} />

          {/* ================= TASKS ================= */}

          <Route
            path="tasks"
            element={
              <ProtectedRoute
                requiredPermissions={PERM_GROUPS.TASK_MANAGE}
              >
                <ManageTask />
              </ProtectedRoute>
            }
          />

          {/* ================= DOCUMENTS ================= */}
          <Route path="documents" element={<Documents />} />

          <Route
            path="tasks/create"
            element={
              <ProtectedRoute requiredPermissions={[PERMS.TASK_CREATE]}>
                <TaskForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/edit/:id"
            element={
              <ProtectedRoute requiredPermissions={[PERMS.TASK_EDIT]}>
                <TaskForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="tasks/:id"
            element={
              <ProtectedRoute requiredPermissions={[PERMS.TASK_VIEW]}>
                <TaskDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="my-tasks"
            element={
              <ProtectedRoute requiredPermissions={[PERMS.TASK_VIEW]}>
                <MyTask />
              </ProtectedRoute>
            }
          />

          {/* ================= ROLES ================= */}

          <Route
            path="roles"
            element={
              <ProtectedRoute
                requiredPermissions={PERM_GROUPS.ROLE_MANAGE}
              >
                <ManageRole />
              </ProtectedRoute>
            }
          />

          <Route
            path="roles/create"
            element={
              <ProtectedRoute requiredPermissions={[PERMS.ROLE_CREATE]}>
                <RoleForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="roles/edit/:roleName"
            element={
              <ProtectedRoute requiredPermissions={[PERMS.ROLE_EDIT]}>
                <RoleForm />
              </ProtectedRoute>
            }
          />

          {/* ================= PERMISSIONS ================= */}

          <Route
            path="permissions"
            element={
              <ProtectedRoute
                requiredPermissions={PERM_GROUPS.PERMISSION_MANAGE}
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
                requiredPermissions={PERM_GROUPS.USER_MANAGE}
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
