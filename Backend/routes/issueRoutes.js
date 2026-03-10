const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const issueController = require("../controllers/issueController");
const issueBulkUpload = require("../middleware/issueBulkUpload");
const issueAttachmentUpload = require("../middleware/issueAttachmentUpload");

router.get(
  "/bulk-template",
  authMiddleware,
  checkPermission(["Create Issue", "View Issue"]),
  issueController.downloadIssueCsvTemplate,
);

router.post(
  "/bulk-upload",
  authMiddleware,
  checkPermission(["Create Issue"]),
  (req, res, next) => {
    issueBulkUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Invalid upload file" });
      }
      return next();
    });
  },
  issueController.bulkUploadIssues,
);

router.get(
  "/bulk-upload/:jobId",
  authMiddleware,
  checkPermission(["Create Issue", "View Issue"]),
  issueController.getBulkUploadStatus,
);

router.post(
  "/",
  authMiddleware,
  checkPermission([
    "Create Issue",
    "View Issue",
    "View Task",
    "Create Task",
    "Edit Task",
    "Delete Task",
  ]),
  (req, res, next) => {
    issueAttachmentUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Invalid attachment file" });
      }
      return next();
    });
  },
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
  checkPermission(["View Issue", "View Task", "Create Task", "Edit Task", "Delete Task"]),
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

router.delete(
  "/:id",
  authMiddleware,
  checkPermission(["Delete Issue"]),
  issueController.deleteIssue,
);

// Fallback for environments that block DELETE
router.post(
  "/:id/delete",
  authMiddleware,
  checkPermission(["Delete Issue"]),
  issueController.deleteIssue,
);

module.exports = router;
