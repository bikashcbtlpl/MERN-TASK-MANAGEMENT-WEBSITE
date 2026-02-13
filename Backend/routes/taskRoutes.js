const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const taskController = require("../controllers/taskController");

/* =======================================================
   CREATE TASK
======================================================= */
router.post(
  "/",
  authMiddleware,
  checkPermission(["Create Task"]),
  taskController.createTask
);


/* =======================================================
   GET ALL TASKS (PAGINATED + ROLE BASED)
   Admin / Manager / Roles with multiple permissions
======================================================= */
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


/* =======================================================
   GET MY TASKS (Normal User)
   ⚠ Must be BEFORE "/:id"
======================================================= */
router.get(
  "/my",
  authMiddleware,
  checkPermission(["View Task"]),
  taskController.getMyTasks
);


/* =======================================================
   GET SINGLE TASK
======================================================= */
router.get(
  "/:id",
  authMiddleware,
  checkPermission(["View Task"]),
  taskController.getTaskById
);


/* =======================================================
   UPDATE TASK
======================================================= */
router.put(
  "/:id",
  authMiddleware,
  checkPermission(["Edit Task"]),
  taskController.updateTask
);


/* =======================================================
   DELETE TASK
======================================================= */
router.delete(
  "/:id",
  authMiddleware,
  checkPermission(["Delete Task"]),
  taskController.deleteTask
);

module.exports = router;
