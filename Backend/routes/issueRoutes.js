const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const issueController = require("../controllers/issueController");

router.post(
  "/",
  authMiddleware,
  // allow any authenticated user to report an issue; permissions can be tightened
  issueController.createIssue
);

router.get("/task/:taskId", authMiddleware, issueController.getIssuesByTask);

router.get("/", authMiddleware, checkPermission(["View Issue"]), issueController.getAllIssues);

router.patch("/:id", authMiddleware, checkPermission(["Edit Issue"]), issueController.updateIssue);

// Admins and Super Admins can quickly resolve an issue
router.patch("/:id/resolve", authMiddleware, issueController.resolveIssue);

module.exports = router;
