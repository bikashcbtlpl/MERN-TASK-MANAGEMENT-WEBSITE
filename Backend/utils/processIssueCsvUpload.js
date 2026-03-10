const fs = require("fs");
const csv = require("csv-parser");
const Issue = require("../models/Issue");

const PRIORITY_MAP = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const STATUS_MAP = {
  open: "Open",
  closed: "Closed",
  resolved: "Closed",
};

const MODULE_MAP = {
  auth: "Auth",
  payment: "Payment",
  dashboard: "Dashboard",
  task: "Task",
  project: "Project",
  role: "Role",
  permission: "Permission",
  other: "Other",
};

const normalizeText = (value) => String(value || "").trim();
const normalizeHeader = (header) =>
  normalizeText(header)
    .replace(/^\uFEFF/, "")
    .toLowerCase();
const readCell = (row, ...keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return "";
};

const flushBatch = async (batch, summary, maxErrors) => {
  if (batch.length === 0) return;

  try {
    const inserted = await Issue.insertMany(batch, { ordered: false });
    summary.createdCount += inserted.length;
  } catch (error) {
    const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];

    if (writeErrors.length > 0) {
      summary.failedCount += writeErrors.length;
      summary.createdCount += Math.max(0, batch.length - writeErrors.length);

      writeErrors.forEach((entry) => {
        if (summary.errors.length >= maxErrors) return;
        const rowIndex = Number(entry?.index);
        const rowDoc = Number.isInteger(rowIndex) ? batch[rowIndex] : null;
        summary.errors.push({
          row: rowDoc?.__row || "Unknown",
          message: entry?.errmsg || "Failed to insert row",
        });
      });
      return;
    }

    summary.failedCount += batch.length;
    if (summary.errors.length < maxErrors) {
      summary.errors.push({
        row: "Batch",
        message: error?.message || "Failed to insert batch",
      });
    }
  }
};

const processIssueCsvUpload = async ({
  filePath,
  reportedBy,
  batchSize = 100,
  maxErrors = 100,
}) => {
  const summary = {
    totalRows: 0,
    createdCount: 0,
    failedCount: 0,
    errors: [],
  };

  const batch = [];
  let rowNumber = 1;

  try {
    const stream = fs
      .createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => normalizeHeader(header) }));

    for await (const row of stream) {
      rowNumber += 1;
      summary.totalRows += 1;

      const title = normalizeText(readCell(row, "title"));
      const description = normalizeText(readCell(row, "description"));
      const priorityRaw = normalizeText(readCell(row, "priority")).toLowerCase();
      const statusRaw = normalizeText(readCell(row, "status")).toLowerCase();
      const moduleRaw = normalizeText(readCell(row, "module")).toLowerCase();

      if (!title || !description) {
        summary.failedCount += 1;
        if (summary.errors.length < maxErrors) {
          summary.errors.push({
            row: rowNumber,
            message: "title and description are required",
          });
        }
        continue;
      }

      if (priorityRaw && !PRIORITY_MAP[priorityRaw]) {
        summary.failedCount += 1;
        if (summary.errors.length < maxErrors) {
          summary.errors.push({
            row: rowNumber,
            message: "Invalid priority",
          });
        }
        continue;
      }

      if (statusRaw && !STATUS_MAP[statusRaw]) {
        summary.failedCount += 1;
        if (summary.errors.length < maxErrors) {
          summary.errors.push({
            row: rowNumber,
            message: "Invalid status",
          });
        }
        continue;
      }

      if (moduleRaw && !MODULE_MAP[moduleRaw]) {
        summary.failedCount += 1;
        if (summary.errors.length < maxErrors) {
          summary.errors.push({
            row: rowNumber,
            message: "Invalid module",
          });
        }
        continue;
      }

      batch.push({
        __row: rowNumber,
        reportedBy,
        title,
        description,
        priority: PRIORITY_MAP[priorityRaw] || "Medium",
        status: STATUS_MAP[statusRaw] || "Open",
        module: MODULE_MAP[moduleRaw] || "Auth",
      });

      if (batch.length >= batchSize) {
        await flushBatch(batch, summary, maxErrors);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      await flushBatch(batch, summary, maxErrors);
      batch.length = 0;
    }

    if (summary.totalRows > summary.createdCount + summary.failedCount) {
      summary.failedCount = summary.totalRows - summary.createdCount;
    }

    return summary;
  } finally {
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Ignore cleanup errors for temp upload files.
    }
  }
};

module.exports = processIssueCsvUpload;
