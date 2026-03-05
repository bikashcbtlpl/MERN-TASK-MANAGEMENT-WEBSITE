const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const roleController = require("../controllers/roleController");

// GET all roles — any authenticated user can view roles (needed for user creation forms etc.)
router.get("/", authMiddleware, roleController.getRoles);

// GET role by name — any authenticated user
router.get("/name/:roleName", authMiddleware, roleController.getRoleByName);

// CREATE role — requires Create Role permission
router.post(
  "/",
  authMiddleware,
  checkPermission(["Create Role"]),
  roleController.createRole,
);

// UPDATE role by name — requires Edit Role permission
router.put(
  "/name/:roleName",
  authMiddleware,
  checkPermission(["Edit Role"]),
  roleController.updateRoleByName,
);

// UPDATE role by ID — requires Edit Role permission
router.put(
  "/:id",
  authMiddleware,
  checkPermission(["Edit Role"]),
  roleController.updateRole,
);

// DELETE role — requires Delete Role permission
router.delete(
  "/:id",
  authMiddleware,
  checkPermission(["Delete Role"]),
  roleController.deleteRole,
);

module.exports = router;
