const Issue = require("../models/Issue");
const Task = require("../models/Task");

exports.createIssue = async (req, res) => {
  try {
    const { task, title, description } = req.body;

    if (!task || !title || !description)
      return res.status(400).json({ message: "Missing required fields" });

    const existingTask = await Task.findById(task);
    if (!existingTask) return res.status(404).json({ message: "Task not found" });

    const newIssue = await Issue.create({
      task,
      reportedBy: req.user._id,
      title,
      description,
    });

    // emit socket event
    req.app.get("io")?.emit("issueCreated", { task: task, issue: newIssue });

    res.status(201).json(newIssue);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating issue" });
  }
};

exports.getIssuesByTask = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const issues = await Issue.find({ task: taskId })
      .populate("reportedBy", "email name")
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching issues" });
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const issues = await Issue.find()
      .populate("reportedBy", "email name")
      .populate("task", "title")
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching issues" });
  }
};

exports.updateIssue = async (req, res) => {
  try {
    const updated = await Issue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Issue not found" });
    req.app.get("io")?.emit("issueUpdated", { issue: updated });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating issue" });
  }
};

exports.resolveIssue = async (req, res) => {
  try {
    // Only allow Admin or Super Admin to resolve
    const roleName = req.user?.role?.name;
    if (!roleName || (roleName !== "Super Admin" && roleName !== "Admin")) {
      return res.status(403).json({ message: "Only Admin or Super Admin can resolve issues" });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue not found" });

    issue.status = "Resolved";
    await issue.save();

    const updated = await Issue.findById(issue._id).populate("reportedBy", "email name");
    req.app.get("io")?.emit("issueUpdated", { issue: updated });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resolving issue" });
  }
};
