const Task = require("../models/Task");
const User = require("../models/User");
const path = require("path");
const { Worker } = require("worker_threads");
const emailQueue = require("../queues/emailQueue"); // ✅ USE BULL QUEUE

/* =====================================================
   WORKER UPLOAD HELPER
===================================================== */
const runUploadWorker = (filePath, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      path.join(__dirname, "../workers/cloudinaryWorker.js"),
      {
        workerData: { filePath, resourceType },
      }
    );

    worker.on("message", (data) => {
      if (data.success) resolve(data.url);
      else reject(data.error);
    });

    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject("Worker stopped unexpectedly");
    });
  });
};

/* =====================================================
   SAFE CLOUDINARY FILE EXTRACTOR
===================================================== */
const extractFiles = async (files, field) => {
  if (!files || !files[field]) return [];
  const uploads = files[field].map((file) =>
    runUploadWorker(file.path)
  );
  return Promise.all(uploads);
};

/* =====================================================
   CREATE TASK
===================================================== */
exports.createTask = async (req, res) => {
  try {

    let {
      title,
      description,
      taskStatus,
      assignedTo,
      startDate,
      endDate,
      notes,
      project,
    } = req.body;

    if (!assignedTo || assignedTo === "") assignedTo = null;

    const images = await extractFiles(req.files, "images");
    const videos = await extractFiles(req.files, "videos");
    const attachments = await extractFiles(req.files, "attachments");

    let assignedUser = null;

    if (assignedTo) {
      assignedUser = await User.findById(assignedTo).populate("role");

      if (
        assignedUser &&
        assignedUser.role.name === "Super Admin" &&
        req.user.role.name !== "Super Admin"
      ) {
        return res
          .status(403)
          .json({ message: "You cannot assign task to Super Admin" });
      }
    }

    const newTask = await Task.create({
      title,
      description,
      taskStatus,
      assignedTo,
      startDate,
      endDate,
      notes,
      project,
      images,
      videos,
      attachments,
      createdBy: req.user._id,
    });

    // If task has a project, add it to the project's tasks array
    if (project) {
      const Project = require("../models/Project");
      try {
        await Project.findByIdAndUpdate(project, { $addToSet: { tasks: newTask._id } });
      } catch (e) {
        console.log("Warning: could not add task to project tasks array", e);
      }
    }

    /* 📧 SEND EMAIL USING BULL QUEUE */
    if (assignedUser?.email) {
      await emailQueue.add({
        to: assignedUser.email,
        subject: "New Task Assigned",
        text: `You have been assigned a new task:\n\nTitle: ${title}\nStatus: ${taskStatus}`,
      });
    }

    req.app.get("io")?.emit("taskUpdated");
    res.status(201).json(newTask);
  } catch (error) {
    console.log("Create Task Error:", error);
    res.status(500).json({ message: "Error creating task" });
  }
};

/* =====================================================
   UPDATE TASK
===================================================== */
exports.updateTask = async (req, res) => {
  try {
    const user = req.user;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const userPermissions = user.role.permissions.map((p) => p.name);
    const isOnlyViewer =
      userPermissions.includes("View Task") &&
      !userPermissions.includes("Edit Task");

    if (isOnlyViewer)
      return res.status(403).json({ message: "Not allowed to edit task" });


    let {
      taskStatus = task.taskStatus,
      assignedTo,
      existingImages,
      existingVideos,
      existingAttachments,
      project,
    } = req.body;

    // Normalize empty strings to null so Mongoose doesn't try to cast "" to ObjectId
    if (assignedTo === "") assignedTo = null;
    if (project === "") project = null;

    if (assignedTo === "") assignedTo = null;

    existingImages = existingImages ? JSON.parse(existingImages) : [];
    existingVideos = existingVideos ? JSON.parse(existingVideos) : [];
    existingAttachments = existingAttachments
      ? JSON.parse(existingAttachments)
      : [];

    const newImages = await extractFiles(req.files, "images");
    const newVideos = await extractFiles(req.files, "videos");
    const newAttachments = await extractFiles(req.files, "attachments");

    const finalImages = [...existingImages, ...newImages];
    const finalVideos = [...existingVideos, ...newVideos];
    const finalAttachments = [...existingAttachments, ...newAttachments];

    // Build explicit update object to avoid passing raw req.body values that may be invalid
    const updateData = {
      taskStatus,
      assignedTo,
      project,
      images: finalImages,
      videos: finalVideos,
      attachments: finalAttachments,
    };

    // Include other updatable fields if present in req.body
    const otherFields = ["title", "description", "startDate", "endDate", "notes", "isActive"];
    otherFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) updateData[f] = req.body[f];
    });

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // If project changed, make sure to update project's tasks arrays
    try {
      const Project = require("../models/Project");
      const oldProjectId = task.project ? String(task.project) : null;
      const newProjectId = project || null;

      if (oldProjectId && (!newProjectId || String(oldProjectId) !== String(newProjectId))) {
        await Project.findByIdAndUpdate(oldProjectId, { $pull: { tasks: updatedTask._id } }).catch(() => {});
      }

      if (newProjectId) {
        await Project.findByIdAndUpdate(newProjectId, { $addToSet: { tasks: updatedTask._id } }).catch(() => {});
      }
    } catch (e) {
      console.log("Warning updating project task lists:", e);
    }

    /* 📧 EMAIL IF REASSIGNED */
    if (assignedTo && String(assignedTo) !== String(task.assignedTo)) {
      const reassignedUser = await User.findById(assignedTo);

      if (reassignedUser?.email) {
        await emailQueue.add({
          to: reassignedUser.email,
          subject: "Task Assigned to You",
          text: `A task has been assigned to you:\n\nTitle: ${updatedTask.title}\nStatus: ${updatedTask.taskStatus}`,
        });
      }
    }

    req.app.get("io")?.emit("taskUpdated");
    res.json(updatedTask);
  } catch (error) {
    console.log("Update Task Error:", error);
    res.status(500).json({ message: "Error updating task" });
  }
};

/* =====================================================
   OTHER CONTROLLERS (UNCHANGED)
===================================================== */
exports.getTasks = async (req, res) => {
  try {
    const user = req.user;

    let filter = {};

    const perms = user.role.permissions.map((p) => p.name);
    const isSuperAdmin = user.role && user.role.name === "Super Admin";

    // If not super admin, restrict to tasks assigned to user or tasks in projects where user is in team
    if (!isSuperAdmin) {
      // Find projects where user is in team
      const Project = require("../models/Project");
      const userProjects = await Project.find({ team: user._id }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      filter.$or = [{ assignedTo: user._id }];
      if (projectIds.length) filter.$or.push({ project: { $in: projectIds } });
    }

    // Apply search (title/description) on top of existing filter
    if (req.query.search) {
      const searchFilter = {
        $or: [
          { title: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
        ],
      };

      if (Object.keys(filter).length === 0) filter = searchFilter;
      else filter = { $and: [filter, searchFilter] };
    }

    if (req.query.taskStatus) filter.taskStatus = req.query.taskStatus;

    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const skip = (page - 1) * limit;

    const totalTasks = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate("assignedTo", "email name")
      .populate("createdBy", "email name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
    });
  } catch {
    res.status(500).json({ message: "Error fetching tasks" });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "email name")
      .populate("createdBy", "email name");

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch {
    res.status(500).json({ message: "Error fetching task" });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    req.app.get("io")?.emit("taskUpdated");
    res.json({ message: "Task deleted successfully" });
  } catch {
    res.status(500).json({ message: "Error deleting task" });
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const search = req.query.search || "";

    const Project = require("../models/Project");

    // If project filter provided, ensure user is allowed to view that project
    const projectFilter = req.query.project;
    if (projectFilter) {
      const proj = await Project.findById(projectFilter).select("team");
      if (!proj) return res.status(404).json({ message: "Project not found" });
      const isTeamMember = proj.team.some(t => String(t) === String(userId));
      const isSuperAdmin = req.user.role && req.user.role.name === "Super Admin";
      if (!isTeamMember && !isSuperAdmin) return res.status(403).json({ message: "Access denied" });
      // Show tasks for that project
      var filter = { project: projectFilter };
    } else {
      // Include tasks assigned to user or tasks in projects where user is a team member
      const userProjects = await Project.find({ team: userId }).select("_id");
      const projectIds = userProjects.map((p) => p._id);

      var filter = { $or: [{ assignedTo: userId }] };
      if (projectIds.length) filter.$or.push({ project: { $in: projectIds } });
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const skip = (page - 1) * limit;

    const totalTasks = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate("assignedTo", "email name")
      .populate("createdBy", "email name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
    });
  } catch {
    res.status(500).json({ message: "Error fetching my tasks" });
  }
};
