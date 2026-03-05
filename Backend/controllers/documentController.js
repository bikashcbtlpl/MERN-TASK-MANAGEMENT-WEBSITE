const Document = require("../models/Document");
const User = require("../models/User");
const runCloudinaryWorker = require("../utils/runCloudinaryWorker");

const getAccessUserId = (accessEntry) => {
  if (!accessEntry) return null;

  // New format: { user, accessType }
  if (typeof accessEntry === "object" && accessEntry.user !== undefined) {
    const userRef = accessEntry.user;
    if (typeof userRef === "object" && userRef?._id) return String(userRef._id);
    return String(userRef);
  }

  // Legacy format: ObjectId/string directly in access array
  if (typeof accessEntry === "object" && accessEntry?._id) return String(accessEntry._id);
  return String(accessEntry);
};

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
        { "access.user": user._id },
      ];
    }

    let docs = await Document.find(filter)
      .populate({ path: "createdBy", select: "name email role", populate: { path: "role", select: "name" } })
      .sort({ createdAt: -1 })
      .lean();

    // Normalize access and accessRequests so UI can display names whether
    // access entries are stored as ObjectId[] (legacy) or {user, accessType}[]
    const userIdSet = new Set();
    docs.forEach((d) => {
      (d.access || []).forEach((a) => {
        if (!a) return;
        const id = getAccessUserId(a);
        if (id) userIdSet.add(id);
      });
      (d.accessRequests || []).forEach((u) => userIdSet.add(String(u)));
      if (d.createdBy) userIdSet.add(String(d.createdBy._id || d.createdBy));
    });

    const userIds = Array.from(userIdSet);
    let usersMap = {};
    if (userIds.length) {
      const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
      usersMap = users.reduce((acc, u) => ({ ...acc, [String(u._id)]: u }), {});
    }

    docs = docs.map((d) => {
      // normalize access
      d.access = (d.access || []).map((a) => {
        if (!a) return null;
        const uid = getAccessUserId(a);
        const accessType =
          typeof a === "object" && a?.accessType ? a.accessType : "view";
        return { user: usersMap[uid] || uid, accessType };
      }).filter(Boolean);

      // normalize accessRequests to user objects when available
      d.accessRequests = (d.accessRequests || []).map((u) => usersMap[String(u)] || u);

      return d;
    });

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

    // Normalize access array to objects { user, accessType }
    const normalizedAccess = (accessArr || []).map((a) => {
      if (typeof a === "string") return { user: a, accessType: "view" };
      if (a && a.user) return { user: a.user || a.userId, accessType: a.accessType || a.type || "view" };
      return null;
    }).filter(Boolean);

    const attachments = await processDocumentFiles(req.files || {});

    const doc = await Document.create({
      name: name.trim(),
      description,
      attachments,
      access: normalizedAccess,
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
    if (doc.access.some((a) => getAccessUserId(a) === String(uid))) {
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

    const { userId, accessType } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const existingIndex = doc.access.findIndex(
      (a) => getAccessUserId(a) === String(userId),
    );

    if (existingIndex === -1) {
      doc.access.push({ user: userId, accessType: accessType === "edit" ? "edit" : "view" });
    } else {
      const existing = doc.access[existingIndex];
      if (typeof existing === "object" && existing?.user !== undefined) {
        existing.accessType = accessType === "edit" ? "edit" : "view";
      } else {
        // convert legacy entry to new shape
        doc.access[existingIndex] = {
          user: userId,
          accessType: accessType === "edit" ? "edit" : "view",
        };
      }
    }

    // Remove from pending requests
    doc.accessRequests = doc.accessRequests.filter((u) => String(u) !== String(userId));
    await doc.save();

    res.json({ message: "Access granted successfully" });
  } catch (err) {
    console.error("Grant Access Error:", err);
    res.status(500).json({ message: "Error granting access" });
  }
};

/* =====================================================
   REVOKE ACCESS
===================================================== */
exports.revokeAccess = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Only creator or super admin can revoke access
    const isOwner = String(doc.createdBy) === String(req.user._id);
    const isSuper = req.user.role?.name === "Super Admin";
    if (!isOwner && !isSuper) {
      return res.status(403).json({ message: "Not allowed - Only document owner or Super Admin can revoke access" });
    }

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    doc.access = doc.access.filter((a) => getAccessUserId(a) !== String(userId));
    await doc.save();

    res.json({ message: "Access revoked successfully" });
  } catch (err) {
    console.error("Revoke Access Error:", err);
    res.status(500).json({ message: "Error revoking access" });
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

/* =====================================================
   UPDATE DOCUMENT
===================================================== */
exports.updateDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Only creator or super admin can update
    const isOwner = String(doc.createdBy) === String(req.user._id);
    const isSuper = req.user.role?.name === "Super Admin";
    if (!isOwner && !isSuper) {
      return res.status(403).json({ message: "Not allowed - Only document owner or Super Admin can update" });
    }

    const { name, description, access } = req.body;

    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ message: "Document name cannot be empty" });
      doc.name = name.trim();
    }
    if (description !== undefined) doc.description = description;

    if (access !== undefined) {
      let accessArr = [];
      try {
        accessArr = JSON.parse(access);
      } catch (e) {
        // if it's already an array or object, attempt to use as-is
        if (Array.isArray(access)) accessArr = access;
        else return res.status(400).json({ message: "Invalid access field format" });
      }

      const normalizedAccess = (accessArr || []).map((a) => {
        if (typeof a === "string") return { user: a, accessType: "view" };
        if (a && a.user) return { user: a.user || a.userId, accessType: a.accessType || a.type || "view" };
        return null;
      }).filter(Boolean);

      doc.access = normalizedAccess;
    }

    await doc.save();
    res.json({ message: "Document updated successfully", document: doc });
  } catch (err) {
    console.error("Update Document Error:", err);
    res.status(500).json({ message: "Error updating document" });
  }
};
