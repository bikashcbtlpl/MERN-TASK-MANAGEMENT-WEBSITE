const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleController = require("../controllers/roleController");

router.post("/", authMiddleware, roleController.createRole);
router.get("/", authMiddleware, roleController.getRoles);

// 🔥 NEW ROUTES
router.get("/name/:roleName", authMiddleware, roleController.getRoleByName);
router.put("/name/:roleName", authMiddleware, roleController.updateRoleByName);

router.put("/:id", authMiddleware, roleController.updateRole);
router.delete("/:id", authMiddleware, roleController.deleteRole);

module.exports = router;
