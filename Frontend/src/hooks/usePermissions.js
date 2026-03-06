import { useAuth } from "../context/AuthContext";
import {
  can as canPermission,
  isSuperAdmin as checkSuperAdmin,
} from "../permissions/can";

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

  const isSuperAdmin = checkSuperAdmin(user);

  /**
   * Returns true if the current user has the given permission
   * (Super Admins always pass).
   */
  const can = (permissionName) => canPermission(user, permissionName);

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
