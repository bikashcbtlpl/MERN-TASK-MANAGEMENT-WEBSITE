const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

/* =====================================================
   SINGLE CLOUDINARY STORAGE (AUTO ROUTES BY FIELD)
===================================================== */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {

    /* ===== IMAGES ===== */
    if (file.fieldname === "images") {
      return {
        folder: "tasks/images",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        public_id: `img_${Date.now()}_${file.originalname}`,
      };
    }

    /* ===== VIDEOS ===== */
    if (file.fieldname === "videos") {
      return {
        folder: "tasks/videos",
        resource_type: "video",
        allowed_formats: ["mp4", "mov", "avi", "mkv"],
        public_id: `vid_${Date.now()}_${file.originalname}`,
      };
    }

    /* ===== ATTACHMENTS ===== */
    if (file.fieldname === "attachments") {
      return {
        folder: "tasks/files",
        resource_type: "raw",
        allowed_formats: [
          "pdf",
          "doc",
          "docx",
          "xls",
          "xlsx",
          "ppt",
          "pptx",
        ],
        public_id: `file_${Date.now()}_${file.originalname}`,
      };
    }

    /* ===== FALLBACK ===== */
    return {
      folder: "tasks/misc",
      resource_type: "auto",
    };
  },
});

/* =====================================================
   SINGLE MULTER INSTANCE
===================================================== */
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // max 100MB
  },
});

/* =====================================================
   EXPORT
===================================================== */
module.exports = upload;
