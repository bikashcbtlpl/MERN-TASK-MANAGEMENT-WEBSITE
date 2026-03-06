const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const userController = require("../controllers/userController");

// GET all users — user-management roles and document-view roles
router.get(
  "/",
  authMiddleware,
  checkPermission([
    "View User",
    "Create User",
    "Edit User",
    "Delete User",
    "View Document",
  ]),
  userController.getUsers,
);

// GET users for document access (all authenticated users)
router.get(
  "/for-access",
  authMiddleware,
  userController.getUsersForDocumentAccess,
);

// GET current logged-in user
router.get("/me", authMiddleware, userController.getCurrentUser);

// CREATE user — requires Create User permission
router.post(
  "/",
  authMiddleware,
  checkPermission(["Create User"]),
  userController.createUser,
);

// UPDATE user — requires Edit User permission
router.put(
  "/:id",
  authMiddleware,
  checkPermission(["Edit User"]),
  userController.updateUser,
);

// DELETE user — requires Delete User permission
router.delete(
  "/:id",
  authMiddleware,
  checkPermission(["Delete User"]),
  userController.deleteUser,
);

module.exports = router;
