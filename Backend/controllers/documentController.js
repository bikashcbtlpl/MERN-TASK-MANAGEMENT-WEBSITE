const Document = require("../models/Document");
const User = require("../models/User");
const path = require("path");
const { Worker } = require("worker_threads");

const runUploadWorker = (filePath, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.join(__dirname, "../workers/cloudinaryWorker.js"),
      {
        workerData: { images: [], videos: [], attachments: [{ path: filePath }] },
      }
    );

    worker.on("message", (data) => {
      if (data.success) resolve(data.attachments[0]);
      else reject(data.error);
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject("Worker stopped unexpectedly");
    });
  });
};

const extractFiles = async (files, field) => {
  if (!files || !files[field]) return [];
  const uploads = files[field].map((file) => runUploadWorker(file.path));
  return Promise.all(uploads);
};

exports.listDocuments = async (req, res) => {
  try {
    // populate createdBy and role so frontend can sort/display Super Admin first
    const docs = await Document.find().populate({ path: "createdBy", populate: { path: "role" } }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error listing documents" });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const { name, description, access } = req.body;
    const accessArr = access ? JSON.parse(access) : [];

    const attachments = await extractFiles(req.files, "attachments");

    const doc = await Document.create({
      name,
      description,
      attachments,
      access: accessArr,
      createdBy: req.user._id,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating document" });
  }
};

exports.requestAccess = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // add requester to accessRequests if not already present
    const uid = req.user._id;
    if (!doc.accessRequests.some((u) => String(u) === String(uid)) && !doc.access.some((u) => String(u) === String(uid))) {
      doc.accessRequests.push(uid);
      await doc.save();
    }

    res.json({ message: "Access request submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error requesting access" });
  }
};

exports.grantAccess = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // only creator or super admin can grant
    const isOwner = String(doc.createdBy) === String(req.user._id);
    const isSuper = req.user.role && req.user.role.name === "Super Admin";
    if (!isOwner && !isSuper) return res.status(403).json({ message: "Not allowed" });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    if (!doc.access.some((u) => String(u) === String(userId))) doc.access.push(userId);
    // remove from requests
    doc.accessRequests = doc.accessRequests.filter((u) => String(u) !== String(userId));
    await doc.save();

    res.json({ message: "Access granted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error granting access" });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    const isOwner = String(doc.createdBy) === String(req.user._id);
    const isSuper = req.user.role && req.user.role.name === "Super Admin";
    if (!isOwner && !isSuper) return res.status(403).json({ message: "Not allowed" });

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting document" });
  }
};
