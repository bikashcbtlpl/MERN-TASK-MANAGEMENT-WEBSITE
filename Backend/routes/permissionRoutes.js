const express = require("express");
const router = express.Router();

const permissionController = require("../controllers/permissionController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, permissionController.getPermissions);
router.post("/", authMiddleware, permissionController.createPermission);
router.put("/:id", authMiddleware, permissionController.updatePermission);
router.delete("/:id", authMiddleware, permissionController.deletePermission);

module.exports = router;
