const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const taskController = require("../controllers/taskController");
const checkPermission = require("../middleware/permissionMiddleware");

/* ================= CREATE TASK ================= */
router.post(
  "/",
  authMiddleware,
  checkPermission(["Create Task"]),
  taskController.createTask
);

/* ================= GET TASKS ================= */
router.get(
  "/",
  authMiddleware,
  checkPermission([
    "View Task",
    "Create Task",
    "Edit Task",
    "Delete Task",
  ]),
  taskController.getTasks
);

router.get(
  "/my",
  authMiddleware,
  taskController.getMyTasks
);

/* ================= GET SINGLE TASK ================= */
router.get(
  "/:id",
  authMiddleware,
  checkPermission(["View Task"]),
  taskController.getTaskById
);

/* ================= UPDATE TASK ================= */
router.put(
  "/:id",
  authMiddleware,
  checkPermission(["Edit Task"]),
  taskController.updateTask
);

/* ================= DELETE TASK ================= */
router.delete(
  "/:id",
  authMiddleware,
  checkPermission(["Delete Task"]),
  taskController.deleteTask
);

module.exports = router;
