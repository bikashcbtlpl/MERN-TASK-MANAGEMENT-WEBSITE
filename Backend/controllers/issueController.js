const Issue = require("../models/Issue");
const Task = require("../models/Task");
const fs = require("fs");
const issueBulkQueue = require("../queues/issueBulkQueue");
const processIssueCsvUpload = require("../utils/processIssueCsvUpload");
const { canAccessTask } = require("../utils/taskAccess");
const { serializeIssue } = require("../utils/serializers");

const VALID_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const VALID_STATUSES = ["Open", "Closed"];
const VALID_MODULES = ["Auth", "Payment", "Dashboard", "Task", "Project", "Role", "Permission", "Other"];

const normalizeStatusInput = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "resolved") return "Closed";
  if (normalized === "open") return "Open";
  if (normalized === "closed") return "Closed";
  return value;
};

/* ================= CSV TEMPLATE ================= */
exports.downloadIssueCsvTemplate = async (_req, res) => {
  const csvTemplate = [
    "title,description,priority,status,module",
    "Login Bug,Login fails,High,Open,Auth",
    "Payment crash,Stripe API error,Critical,Open,Payment",
  ].join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="issue-bulk-template.csv"');
  res.status(200).send(csvTemplate);
};

/* ================= BULK UPLOAD ================= */
exports.bulkUploadIssues = async (req, res) => {
  try {
    if (!req.file?.path) {
      return res.status(400).json({ message: "CSV or Excel file is required" });
    }

    const reportedBy = req.user?._id;
    if (!reportedBy) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Redis queue mode (recommended for large files)
    if (issueBulkQueue) {
      try {
        const job = await issueBulkQueue.add({
          filePath: req.file.path,
          reportedBy: String(reportedBy),
        });

        return res.status(202).json({
          message: "Bulk upload queued",
          queued: true,
          jobId: String(job.id),
        });
      } catch (queueErr) {
        // If Redis/Bull is temporarily down, continue with inline processing
        // so users can still upload CSV files.
        console.warn(
          "[issues:bulk-upload] Queue unavailable, falling back to inline mode:",
          queueErr?.message || queueErr,
        );
      }
    }

    // Fallback mode when REDIS_ENABLED=false
    const summary = await processIssueCsvUpload({
      filePath: req.file.path,
      reportedBy,
      batchSize: 10000,
      maxErrors: 100,
    });

    req.app.get("io")?.emit("issueBulkCompleted", { summary });

    return res.status(200).json({
      message: "Bulk upload processed",
      queued: false,
      summary,
    });
  } catch (err) {
    if (req.file?.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch {
        // Ignore cleanup errors.
      }
    }
    console.error("Bulk Upload Issues Error:", err);
    return res.status(500).json({ message: "Error processing bulk upload" });
  }
};

/* ================= BULK JOB STATUS ================= */
exports.getBulkUploadStatus = async (req, res) => {
  try {
    if (!issueBulkQueue) {
      return res.status(400).json({
        message: "Queue mode is disabled",
        queueEnabled: false,
      });
    }

    const job = await issueBulkQueue.getJob(req.params.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const state = await job.getState();
    const result = job.returnvalue || null;
    const failedReason = job.failedReason || null;

    return res.json({
      jobId: String(job.id),
      state,
      summary: result,
      failedReason,
    });
  } catch (err) {
    console.error("Get Bulk Upload Status Error:", err);
    return res.status(500).json({ message: "Error fetching upload status" });
  }
};

/* ================= CREATE ISSUE ================= */
exports.createIssue = async (req, res) => {
  try {
    const {
      task,
      title,
      description,
      priority,
      module,
      attachmentName: attachmentNameFromBody,
    } = req.body;

    const attachmentName = req.file?.originalname || attachmentNameFromBody;
    const attachmentUrl = req.file?.path || "";

    if (!title || !description) {
      return res
        .status(400)
        .json({ message: "title and description are required" });
    }

    if (!title.trim() || !description.trim()) {
      return res
        .status(400)
        .json({ message: "Title and description cannot be empty" });
    }

    let existingTask = null;
    if (task) {
      existingTask = await Task.findById(task).lean();
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      const hasTaskAccess = await canAccessTask(req.user, existingTask);
      if (!hasTaskAccess) {
        return res.status(403).json({
          message: "Access denied - You cannot report issues for this task",
        });
      }
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    if (module && !VALID_MODULES.includes(module)) {
      return res.status(400).json({ message: "Invalid module" });
    }

    const newIssue = await Issue.create({
      task: task || null,
      reportedBy: req.user._id,
      title: title.trim(),
      description: description.trim(),
      priority: priority || "Medium",
      status: "Open",
      module: module || "Auth",
      attachmentName: (attachmentName || "").trim(),
      attachmentUrl: (attachmentUrl || "").trim(),
    });

    // Emit socket event
    req.app.get("io")?.emit("issueCreated", { task: task || null, issue: newIssue });

    res.status(201).json(serializeIssue(newIssue));
  } catch (err) {
    console.error("Create Issue Error:", err);
    res.status(500).json({ message: "Error creating issue" });
  }
};

/* ================= GET ISSUES BY TASK ================= */
exports.getIssuesByTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;

    // Verify the task exists
    const task = await Task.findById(taskId)
      .select("_id project")
      .lean();
    if (!task) return res.status(404).json({ message: "Task not found" });

    const hasTaskAccess = await canAccessTask(req.user, task);
    if (!hasTaskAccess) {
      return res.status(403).json({
        message: "Access denied - You cannot view issues for this task",
      });
    }

    const issues = await Issue.find({ task: taskId })
      .populate("reportedBy", "email name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(issues.map((issue) => serializeIssue(issue)));
  } catch (err) {
    console.error("Get Issues By Task Error:", err);
    res.status(500).json({ message: "Error fetching issues" });
  }
};

/* ================= GET ALL ISSUES ================= */
exports.getAllIssues = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.query.status) {
      const normalizedStatus = normalizeStatusInput(req.query.status);
      if (normalizedStatus === "Closed") {
        filter.status = { $in: ["Closed", "Resolved"] };
      } else {
        filter.status = normalizedStatus;
      }
    }

    const [total, issues] = await Promise.all([
      Issue.countDocuments(filter),
      Issue.find(filter)
        .populate("reportedBy", "email name")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      issues: issues.map((issue) => serializeIssue(issue)),
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get All Issues Error:", err);
    res.status(500).json({ message: "Error fetching issues" });
  }
};

/* ================= UPDATE ISSUE ================= */
exports.updateIssue = async (req, res) => {
  try {
    const existing = await Issue.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: "Issue not found" });

    // Whitelist update fields
    const {
      title,
      description,
      status,
      isActive,
      priority,
      module,
      attachmentName,
      task,
    } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) {
      const normalizedStatus = normalizeStatusInput(status);
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      updateData.status = normalizedStatus;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority" });
      }
      updateData.priority = priority;
    }
    if (module !== undefined) {
      if (!VALID_MODULES.includes(module)) {
        return res.status(400).json({ message: "Invalid module" });
      }
      updateData.module = module;
    }
    if (attachmentName !== undefined) {
      updateData.attachmentName = String(attachmentName || "").trim();
    }
    if (task !== undefined) {
      if (task) {
        const existingTask = await Task.findById(task).select("_id project").lean();
        if (!existingTask) {
          return res.status(404).json({ message: "Task not found" });
        }
        const hasTaskAccess = await canAccessTask(req.user, existingTask);
        if (!hasTaskAccess) {
          return res.status(403).json({
            message: "Access denied - You cannot link this task",
          });
        }
        updateData.task = task;
      } else {
        updateData.task = null;
      }
    }

    const updated = await Issue.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("reportedBy", "email name")
      .lean();

    req.app.get("io")?.emit("issueUpdated", { issue: updated });
    res.json(serializeIssue(updated));
  } catch (err) {
    console.error("Update Issue Error:", err);
    res.status(500).json({ message: "Error updating issue" });
  }
};

/* ================= RESOLVE ISSUE ================= */
exports.resolveIssue = async (req, res) => {
  try {
    const user = req.user;

    // Use permission-based check instead of hardcoded role names
    const roleName = String(user.role?.name || user.role || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    const isSuperAdmin = roleName === "superadmin";
    const userPermissions = (user.role?.permissions || [])
      .filter((p) => p && p.status !== "Inactive")
      .map((p) => p.name);
    const canResolve = isSuperAdmin || userPermissions.includes("Edit Issue");

    if (!canResolve) {
      return res.status(403).json({
        message: "Access Denied - You do not have permission to resolve issues",
      });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    if (issue.status === "Closed" || issue.status === "Resolved") {
      return res.status(400).json({ message: "Issue is already resolved" });
    }

    issue.status = "Closed";
    await issue.save();

    const updated = await Issue.findById(issue._id)
      .populate("reportedBy", "email name")
      .lean();

    req.app.get("io")?.emit("issueUpdated", { issue: updated });
    res.json(serializeIssue(updated));
  } catch (err) {
    console.error("Resolve Issue Error:", err);
    res.status(500).json({ message: "Error resolving issue" });
  }
};

/* ================= DELETE ISSUE ================= */
exports.deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate("task", "project")
      .lean();
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    // Permission middleware already guards Delete Issue access.

    await Issue.deleteOne({ _id: issue._id });

    req.app.get("io")?.emit("issueDeleted", {
      issueId: String(issue._id),
      task: issue.task?._id || issue.task,
    });

    res.json({ message: "Issue deleted" });
  } catch (err) {
    console.error("Delete Issue Error:", err);
    res.status(500).json({ message: "Error deleting issue" });
  }
};
