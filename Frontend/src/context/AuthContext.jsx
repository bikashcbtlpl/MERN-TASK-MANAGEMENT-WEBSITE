import { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Custom setter — keeps a minimal localStorage flag for the 401 redirect */
  const setUser = (u) => {
    setUserState(u);
    if (u) {
      try { localStorage.setItem("user", JSON.stringify({ id: u.id || u._id })); } catch { /* ignore */ }
    } else {
      try { localStorage.removeItem("user"); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await axiosInstance.get("/auth/verify");
        const serverUser = res.data.user || {};
        const perms = serverUser.permissions || [];
        const roleFromServer = serverUser.role || {};
        const roleName =
          typeof roleFromServer === "string"
            ? roleFromServer
            : roleFromServer.name || null;
        const rolePermissions = Array.isArray(roleFromServer.permissions)
          ? roleFromServer.permissions.map((p) =>
            typeof p === "string" ? p : p.name,
          )
          : perms;

        const roleObj = {
          name: roleName,
          permissions: rolePermissions.map((p) => ({ name: p })),
        };

        const normalized = {
          id: serverUser.id,
          _id: serverUser._id || serverUser.id,
          name: serverUser.name,
          email: serverUser.email,
          role: roleObj,
          permissions: Array.isArray(perms) ? perms : rolePermissions,
          preferences: serverUser.preferences || { theme: "system", selectedProject: "", autoSaveDocuments: false },
        };

        setUser(normalized);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

export { useAuth };
