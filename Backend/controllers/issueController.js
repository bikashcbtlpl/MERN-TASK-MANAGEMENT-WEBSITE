const Issue = require("../models/Issue");
const Task = require("../models/Task");

/* ================= CREATE ISSUE ================= */
exports.createIssue = async (req, res) => {
  try {
    const { task, title, description } = req.body;

    if (!task || !title || !description) {
      return res.status(400).json({ message: "task, title, and description are required" });
    }

    if (!title.trim() || !description.trim()) {
      return res.status(400).json({ message: "Title and description cannot be empty" });
    }

    const existingTask = await Task.findById(task).lean();
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const newIssue = await Issue.create({
      task,
      reportedBy: req.user._id,
      title: title.trim(),
      description: description.trim(),
    });

    // Emit socket event
    req.app.get("io")?.emit("issueCreated", { task, issue: newIssue });

    res.status(201).json(newIssue);
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
    const task = await Task.findById(taskId).select("_id assignedTo project").lean();
    if (!task) return res.status(404).json({ message: "Task not found" });

    const issues = await Issue.find({ task: taskId })
      .populate("reportedBy", "email name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(issues);
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
    if (req.query.status) filter.status = req.query.status;

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

    res.json({ issues, total, currentPage: page, totalPages: Math.ceil(total / limit) });
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
    const { title, description, status, isActive } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (status !== undefined) updateData.status = status;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Issue.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("reportedBy", "email name")
      .lean();

    req.app.get("io")?.emit("issueUpdated", { issue: updated });
    res.json(updated);
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
    const isSuperAdmin = user.role?.name === "Super Admin";
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

    if (issue.status === "Resolved") {
      return res.status(400).json({ message: "Issue is already resolved" });
    }

    issue.status = "Resolved";
    await issue.save();

    const updated = await Issue.findById(issue._id)
      .populate("reportedBy", "email name")
      .lean();

    req.app.get("io")?.emit("issueUpdated", { issue: updated });
    res.json(updated);
  } catch (err) {
    console.error("Resolve Issue Error:", err);
    res.status(500).json({ message: "Error resolving issue" });
  }
};
