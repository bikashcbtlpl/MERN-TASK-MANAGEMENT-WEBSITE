const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const taskController = require("../controllers/taskController");

/* ✅ SINGLE UPLOAD MIDDLEWARE */
const upload = require("../middleware/upload");

/* =======================================================
   CREATE TASK (WITH FILE UPLOAD)
======================================================= */
router.post(
  "/",
  authMiddleware,
  checkPermission(["Create Task"]),
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
    { name: "attachments", maxCount: 10 },
  ]),
  taskController.createTask
);

/* =======================================================
   GET ALL TASKS (PAGINATED + ROLE BASED)
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
   GET MY TASKS
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
   UPDATE TASK (WITH FILE UPLOAD)
======================================================= */
router.put(
  "/:id",
  authMiddleware,
  checkPermission(["Edit Task"]),
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
    { name: "attachments", maxCount: 10 },
  ]),
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
