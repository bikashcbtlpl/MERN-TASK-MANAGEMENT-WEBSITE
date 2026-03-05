const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const documentController = require("../controllers/documentController");
const upload = require("../middleware/upload");

// List documents
router.get("/", authMiddleware, documentController.listDocuments);

// Create document (file upload)
router.post(
  "/",
  authMiddleware,
  upload.fields([{ name: "attachments", maxCount: 1 }]),
  documentController.createDocument,
);

// Request access
router.post(
  "/:id/request-access",
  authMiddleware,
  documentController.requestAccess,
);

// Grant access (only owner or super admin)
router.post("/:id/grant", authMiddleware, documentController.grantAccess);

// Revoke access
router.post("/:id/revoke", authMiddleware, documentController.revokeAccess);

// Update document
router.put(
  "/:id",
  authMiddleware,
  upload.fields([{ name: "attachments", maxCount: 1 }]),
  documentController.updateDocument,
);

// Delete document
router.delete("/:id", authMiddleware, documentController.deleteDocument);

module.exports = router;
