const Task = require("../models/Task");
const User = require("../models/User");
const path = require("path");
const { Worker } = require("worker_threads");

/* =====================================================
   STATUS VALIDATION HELPER
===================================================== */
const validateStatusCombo = (taskStatus, completionStatus) => {
  const openStates = ["Open", "In Progress", "On Hold"];

  if (openStates.includes(taskStatus) && completionStatus !== "Pending") {
    return "Open / In Progress / On Hold tasks must have completion status = Pending";
  }

  if (
    taskStatus === "Closed" &&
    !["Completed", "Cancelled"].includes(completionStatus)
  ) {
    return "Closed tasks must have completion status = Completed or Cancelled";
  }

  return null;
};

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
   SAFE CLOUDINARY FILE EXTRACTOR (WITH WORKER)
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
      completionStatus,
      assignedTo,
      startDate,
      endDate,
      notes,
    } = req.body;

    if (!assignedTo || assignedTo === "") assignedTo = null;

    // 🔥 Worker uploads here
    const images = await extractFiles(req.files, "images");
    const videos = await extractFiles(req.files, "videos");
    const attachments = await extractFiles(req.files, "attachments");

    if (assignedTo) {
      const userToAssign = await User.findById(assignedTo).populate("role");
      if (
        userToAssign &&
        userToAssign.role.name === "Super Admin" &&
        req.user.role.name !== "Super Admin"
      ) {
        return res
          .status(403)
          .json({ message: "You cannot assign task to Super Admin" });
      }
    }

    const statusError = validateStatusCombo(taskStatus, completionStatus);
    if (statusError) return res.status(400).json({ message: statusError });

    const newTask = await Task.create({
      title,
      description,
      taskStatus,
      completionStatus,
      assignedTo,
      startDate,
      endDate,
      notes,
      images,
      videos,
      attachments,
      createdBy: req.user._id,
    });

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
      completionStatus = task.completionStatus,
      assignedTo,
      existingImages,
      existingVideos,
      existingAttachments,
    } = req.body;

    if (assignedTo === "") assignedTo = null;

    const statusError = validateStatusCombo(taskStatus, completionStatus);
    if (statusError) return res.status(400).json({ message: statusError });

    existingImages = existingImages ? JSON.parse(existingImages) : [];
    existingVideos = existingVideos ? JSON.parse(existingVideos) : [];
    existingAttachments = existingAttachments
      ? JSON.parse(existingAttachments)
      : [];

    // 🔥 Worker uploads here
    const newImages = await extractFiles(req.files, "images");
    const newVideos = await extractFiles(req.files, "videos");
    const newAttachments = await extractFiles(req.files, "attachments");

    const finalImages = [...existingImages, ...newImages];
    const finalVideos = [...existingVideos, ...newVideos];
    const finalAttachments = [...existingAttachments, ...newAttachments];

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        assignedTo,
        images: finalImages,
        videos: finalVideos,
        attachments: finalAttachments,
      },
      { new: true, runValidators: true }
    );

    req.app.get("io")?.emit("taskUpdated");
    res.json(updatedTask);
  } catch (error) {
    console.log("Update Task Error:", error);
    res.status(500).json({ message: "Error updating task" });
  }
};

/* =====================================================
   REMAINING ROUTES UNCHANGED
===================================================== */

exports.getTasks = async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    const perms = user.role.permissions.map((p) => p.name);
    const isOnlyViewer =
      perms.includes("View Task") &&
      !perms.includes("Create Task") &&
      !perms.includes("Edit Task") &&
      !perms.includes("Delete Task");

    if (isOnlyViewer) filter.assignedTo = user._id;

    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
      ];
    }

    if (req.query.taskStatus) filter.taskStatus = req.query.taskStatus;
    if (req.query.completionStatus)
      filter.completionStatus = req.query.completionStatus;

    const page = +req.query.page || 1;
    const limit = +req.query.limit || 10;
    const skip = (page - 1) * limit;

    const totalTasks = await Task.countDocuments(filter);

    const tasks = await Task.find(filter)
      .populate("assignedTo", "email")
      .populate("createdBy", "email")
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
      .populate("assignedTo", "email")
      .populate("createdBy", "email");

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

    let filter = { assignedTo: userId };

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
      .populate("assignedTo", "email")
      .populate("createdBy", "email")
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
