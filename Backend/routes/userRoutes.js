const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const superAdminOnly = require("../middleware/superAdminOnly");
const userController = require("../controllers/userController");

// GET all users — Admin/Super Admin only
router.get(
    "/",
    authMiddleware,
    checkPermission(["View User", "Create User", "Edit User", "Delete User"]),
    userController.getUsers
);

// GET current logged-in user
router.get("/me", authMiddleware, userController.getCurrentUser);

// CREATE user — requires Create User permission
router.post(
    "/",
    authMiddleware,
    checkPermission(["Create User"]),
    userController.createUser
);

// UPDATE user — requires Edit User permission
router.put(
    "/:id",
    authMiddleware,
    checkPermission(["Edit User"]),
    userController.updateUser
);

// DELETE user — requires Delete User permission
router.delete(
    "/:id",
    authMiddleware,
    checkPermission(["Delete User"]),
    userController.deleteUser
);

module.exports = router;
