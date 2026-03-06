const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const checkPermission = require("../middleware/permissionMiddleware");
const documentController = require("../controllers/documentController");
const upload = require("../middleware/upload");

// List documents
router.get(
  "/",
  authMiddleware,
  checkPermission(["View Document"]),
  documentController.listDocuments,
);

// List users for document access
router.get(
  "/access-users",
  authMiddleware,
  checkPermission(["View Document"]),
  documentController.listAccessUsers,
);

// Create document (file upload)
router.post(
  "/",
  authMiddleware,
  checkPermission(["Create Document"]),
  upload.fields([{ name: "attachments", maxCount: 1 }]),
  documentController.createDocument,
);

// Request access
router.post(
  "/:id/request-access",
  authMiddleware,
  checkPermission(["View Document"]),
  documentController.requestAccess,
);

// Grant access (only owner or super admin)
router.post(
  "/:id/grant",
  authMiddleware,
  checkPermission(["Edit Document"]),
  documentController.grantAccess,
);

// Revoke access
router.post(
  "/:id/revoke",
  authMiddleware,
  checkPermission(["Edit Document"]),
  documentController.revokeAccess,
);

// Update document
router.put(
  "/:id",
  authMiddleware,
  checkPermission(["Edit Document"]),
  upload.fields([{ name: "attachments", maxCount: 1 }]),
  documentController.updateDocument,
);

// Delete document
router.delete(
  "/:id",
  authMiddleware,
  checkPermission(["Delete Document"]),
  documentController.deleteDocument,
);

module.exports = router;
