const express = require("express");
const router = express.Router();

const permissionController = require("../controllers/permissionController");
const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");

// GET all permissions — any authenticated user can view (needed for role management forms)
router.get("/", authMiddleware, permissionController.getPermissions);

// CREATE permission — Super Admin only (via Edit Permission)
router.post(
    "/",
    authMiddleware,
    checkPermission(["Create Permission"]),
    permissionController.createPermission
);

// UPDATE permission — requires Edit Permission
router.put(
    "/:id",
    authMiddleware,
    checkPermission(["Edit Permission"]),
    permissionController.updatePermission
);

// DELETE permission — requires Delete Permission
router.delete(
    "/:id",
    authMiddleware,
    checkPermission(["Delete Permission"]),
    permissionController.deletePermission
);

module.exports = router;
