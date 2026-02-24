import { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      const parsed = JSON.parse(storedUser);
      // Normalize stored user shape to have role object with permissions as [{name}]
      const normalize = (u) => {
        if (!u) return null;
        // Build role object
        let roleObj = u.role || null;
        let topPerms = u.permissions || [];

        if (typeof roleObj === "string") {
          roleObj = { name: roleObj, permissions: topPerms.map((p) => ({ name: p })) };
        } else if (roleObj && Array.isArray(roleObj.permissions)) {
          // role.permissions may be array of strings or objects
          if (typeof roleObj.permissions[0] === "string") {
            roleObj.permissions = roleObj.permissions.map((p) => ({ name: p }));
          }
        } else if (!roleObj) {
          roleObj = { name: null, permissions: topPerms.map((p) => ({ name: p })) };
        }

        // Ensure top-level permissions array of strings for legacy checks
        const permissions = (u.permissions && Array.isArray(u.permissions))
          ? u.permissions
          : (roleObj.permissions || []).map((p) => (p && p.name) || p);

        return { ...u, role: roleObj, permissions };
      };

      return normalize(parsed);
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {

      const storedUser = localStorage.getItem("user");

      if (!storedUser) {
        setLoading(false);
        return;
      }

      try {
        const res = await axiosInstance.get("/auth/verify");
        // Normalize to expected shape: role -> { name, permissions: [{name}] }
        const serverUser = res.data.user || {};
        // serverUser.role may be a string (role name) or an object { name, permissions }
        const perms = serverUser.permissions || [];
        const roleFromServer = serverUser.role || {};
        const roleName = (typeof roleFromServer === "string") ? roleFromServer : (roleFromServer.name || null);
        const rolePermissions = Array.isArray(roleFromServer.permissions)
          ? roleFromServer.permissions.map((p) => (typeof p === "string" ? p : p.name))
          : perms;

        const roleObj = { name: roleName, permissions: rolePermissions.map((p) => ({ name: p })) };

        const normalized = {
          id: serverUser.id,
          name: serverUser.name,
          email: serverUser.email,
          role: roleObj,
          permissions: Array.isArray(perms) ? perms : rolePermissions,
        };

        setUser(normalized);
        localStorage.setItem("user", JSON.stringify(normalized));
      } catch (error) {
        setUser(null);
        localStorage.removeItem("user");
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

export function useAuth() {
  return useContext(AuthContext);
}
