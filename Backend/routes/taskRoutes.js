const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const taskController = require("../controllers/taskController");
const checkPermission = require("../middleware/permissionMiddleware");

router.post("/", authMiddleware, taskController.createTask);
router.get("/", authMiddleware, taskController.getTasks);
router.get("/:id", authMiddleware, taskController.getTaskById);
router.put("/:id", authMiddleware, taskController.updateTask);
router.delete("/:id", authMiddleware, taskController.deleteTask);

router.get(
  "/",
  authMiddleware,
  checkPermission(["View Task", "Create Task", "Edit Task", "Delete Task"]),
  taskController.getTasks
);

router.post(
  "/",
  authMiddleware,
  checkPermission("Create Task"),
  taskController.createTask
);

router.put(
  "/:id",
  authMiddleware,
  checkPermission("Edit Task"),
  taskController.updateTask
);

router.delete(
  "/:id",
  authMiddleware,
  checkPermission("Delete Task"),
  taskController.deleteTask
);


module.exports = router;
