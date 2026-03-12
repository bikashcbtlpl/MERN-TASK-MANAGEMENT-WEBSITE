const fs = require("fs");
const path = require("path");
const multer = require("multer");

const tempUploadDir = path.join(__dirname, "..", "tmp", "issue-uploads");
fs.mkdirSync(tempUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempUploadDir),
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || "issues.csv").replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const original = String(file.originalname || "").toLowerCase();
  const isCsvByName = original.endsWith(".csv");
  const isExcelByName = original.endsWith(".xlsx") || original.endsWith(".xls");
  
  const isCsvByMime = String(file.mimetype || "").includes("csv");
  const isExcelByMime = file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.mimetype === "application/vnd.ms-excel";

  if (isCsvByName || isCsvByMime || isExcelByName || isExcelByMime) {
    cb(null, true);
    return;
  }

  cb(new Error("Only CSV and Excel files are allowed"));
};

const issueBulkUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 * 1024, // 100 GB in bytes
  },
}).single("file");

module.exports = issueBulkUpload;
