const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => ({
    folder: "issues/attachments",
    resource_type: "auto",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "pdf"],
    public_id: `issue_${Date.now()}_${String(file.originalname || "attachment").replace(/\s+/g, "_")}`,
  }),
});

const issueAttachmentUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("attachment");

module.exports = issueAttachmentUpload;
