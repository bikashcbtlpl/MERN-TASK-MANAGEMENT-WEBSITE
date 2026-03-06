const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const issueController = require("../controllers/issueController");

router.post(
  "/",
  authMiddleware,
  checkPermission(["View Task", "Create Task", "Edit Task", "Delete Task"]),
  issueController.createIssue,
);

router.get(
  "/task/:taskId",
  authMiddleware,
  checkPermission(["View Task", "Create Task", "Edit Task", "Delete Task"]),
  issueController.getIssuesByTask,
);

router.get(
  "/",
  authMiddleware,
  checkPermission(["View Issue"]),
  issueController.getAllIssues,
);

router.patch(
  "/:id",
  authMiddleware,
  checkPermission(["Edit Issue"]),
  issueController.updateIssue,
);

router.patch(
  "/:id/resolve",
  authMiddleware,
  checkPermission(["Edit Issue"]),
  issueController.resolveIssue,
);

module.exports = router;
