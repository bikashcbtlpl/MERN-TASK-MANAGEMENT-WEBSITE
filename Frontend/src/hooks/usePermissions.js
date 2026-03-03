import { useAuth } from "../context/AuthContext";

/**
 * usePermissions — single source of truth for permission checks.
 *
 * The AuthContext normalises the user to one of two shapes:
 *   (a) user.role.permissions = [{name: "Create Task"}, ...]   ← after server verify
 *   (b) user.permissions       = ["Create Task", ...]           ← flat legacy fallback
 *
 * This hook handles BOTH shapes so every page works correctly regardless
 * of which code path populated the user in localStorage.
 *
 * Usage (resource-based shorthand):
 *   const { canCreate, canEdit, canDelete, canView } = usePermissions("Task");
 *
 * Usage (free-form check):
 *   const { can, isSuperAdmin } = usePermissions();
 *   if (can("Resolve Issue")) { ... }
 */
const usePermissions = (resource) => {
    const { user } = useAuth();

    const isSuperAdmin = user?.role?.name === "Super Admin";

    // Build a flat array of permission name strings from whichever shape is present
    const permNames = (() => {
        // Prefer role.permissions (array of objects {name} or strings)
        const rolePerms = user?.role?.permissions;
        if (Array.isArray(rolePerms) && rolePerms.length > 0) {
            return rolePerms.map((p) =>
                typeof p === "string" ? p : p?.name || "",
            );
        }
        // Fallback: top-level user.permissions (flat string array)
        const flatPerms = user?.permissions;
        if (Array.isArray(flatPerms)) return flatPerms;
        return [];
    })();

    /**
     * Returns true if the current user has the given permission
     * (Super Admins always pass).
     */
    const can = (permissionName) =>
        isSuperAdmin || permNames.includes(permissionName);

    if (resource) {
        return {
            isSuperAdmin,
            can,
            canCreate: can(`Create ${resource}`),
            canEdit: can(`Edit ${resource}`),
            canDelete: can(`Delete ${resource}`),
            canView: can(`View ${resource}`),
        };
    }

    return { isSuperAdmin, can };
};

export default usePermissions;
