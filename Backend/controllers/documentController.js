const Document = require("../models/Document");
const runCloudinaryWorker = require("../utils/runCloudinaryWorker");

/* =====================================================
   UPLOAD DOCUMENT ATTACHMENTS VIA CLOUDINARY WORKER
===================================================== */
const processDocumentFiles = async (files = {}) => {
  const attachments = (files.attachments || []).map((f) => ({ path: f.path }));

  if (!attachments.length) return [];

  const result = await runCloudinaryWorker({ images: [], videos: [], attachments });
  return result.attachments || [];
};

/* =====================================================
   LIST DOCUMENTS
===================================================== */
exports.listDocuments = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user.role?.name === "Super Admin";

    let filter = {};

    // Non-super-admin can only see documents they created or have access to
    if (!isSuperAdmin) {
      filter.$or = [
        { createdBy: user._id },
        { access: user._id },
      ];
    }

    const docs = await Document.find(filter)
      .populate({ path: "createdBy", select: "name email role", populate: { path: "role", select: "name" } })
      .sort({ createdAt: -1 })
      .lean();

    res.json(docs);
  } catch (err) {
    console.error("List Documents Error:", err);
    res.status(500).json({ message: "Error listing documents" });
  }
};

/* =====================================================
   CREATE DOCUMENT
===================================================== */
exports.createDocument = async (req, res) => {
  try {
    const { name, description, access } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Document name is required" });
    }

    let accessArr = [];
    if (access) {
      try {
        accessArr = JSON.parse(access);
      } catch {
        return res.status(400).json({ message: "Invalid access field format" });
      }
    }

    const attachments = await processDocumentFiles(req.files || {});

    const doc = await Document.create({
      name: name.trim(),
      description,
      attachments,
      access: accessArr,
      createdBy: req.user._id,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error("Create Document Error:", err);
    res.status(500).json({ message: "Error creating document" });
  }
};

/* =====================================================
   REQUEST ACCESS
===================================================== */
exports.requestAccess = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const uid = req.user._id;

    // Already has access
    if (doc.access.some((u) => String(u) === String(uid))) {
      return res.json({ message: "You already have access to this document" });
    }

    // Already requested
    if (doc.accessRequests.some((u) => String(u) === String(uid))) {
      return res.json({ message: "Access request already submitted" });
    }

    doc.accessRequests.push(uid);
    await doc.save();

    res.json({ message: "Access request submitted successfully" });
  } catch (err) {
    console.error("Request Access Error:", err);
    res.status(500).json({ message: "Error requesting access" });
  }
};

/* =====================================================
   GRANT ACCESS
===================================================== */
exports.grantAccess = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Only creator or super admin can grant access
    const isOwner = String(doc.createdBy) === String(req.user._id);
    const isSuper = req.user.role?.name === "Super Admin";
    if (!isOwner && !isSuper) {
      return res.status(403).json({ message: "Not allowed - Only document owner or Super Admin can grant access" });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    if (!doc.access.some((u) => String(u) === String(userId))) {
      doc.access.push(userId);
    }

    // Remove from pending requests
    doc.accessRequests = doc.accessRequests.filter(
      (u) => String(u) !== String(userId),
    );
    await doc.save();

    res.json({ message: "Access granted successfully" });
  } catch (err) {
    console.error("Grant Access Error:", err);
    res.status(500).json({ message: "Error granting access" });
  }
};

/* =====================================================
   DELETE DOCUMENT
===================================================== */
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = String(doc.createdBy) === String(req.user._id);
    const isSuper = req.user.role?.name === "Super Admin";
    if (!isOwner && !isSuper) {
      return res.status(403).json({ message: "Not allowed - Only document owner or Super Admin can delete" });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    console.error("Delete Document Error:", err);
    res.status(500).json({ message: "Error deleting document" });
  }
};
