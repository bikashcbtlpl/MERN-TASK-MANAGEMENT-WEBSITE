const Task = require("../models/Task");
const User = require("../models/User");
const mongoose = require("mongoose");
const runCloudinaryWorker = require("../utils/runCloudinaryWorker");
const emailQueue = require("../queues/emailQueue");

/* =====================================================
   SAFE CLOUDINARY FILE EXTRACTOR
   Passes files to the cloudinaryWorker via the shared util.
===================================================== */
const processTaskFiles = async (files = {}) => {
  const images = (files.images || []).map((f) => ({ path: f.path }));
  const videos = (files.videos || []).map((f) => ({ path: f.path }));
  const attachments = (files.attachments || []).map((f) => ({ path: f.path }));

  // Skip worker if no files to process
  if (!images.length && !videos.length && !attachments.length) {
    return { images: [], videos: [], attachments: [] };
  }

  const result = await runCloudinaryWorker({ images, videos, attachments });
  return {
    images: result.images || [],
    videos: result.videos || [],
    attachments: result.attachments || [],
  };
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

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Description is required" });
    }

    if (!assignedTo || assignedTo === "") assignedTo = null;
    if (!project || project === "") project = null;

    // Date validation
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date cannot be before start date" });
    }

    // Check assignee is not Super Admin
    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo)
        .populate("role")
        .lean();

      if (!assignedUser) {
        return res.status(404).json({ message: "Assigned user not found" });
      }

      if (
        assignedUser.role?.name === "Super Admin" &&
        req.user.role?.name !== "Super Admin"
      ) {
        return res
          .status(403)
          .json({ message: "You cannot assign tasks to Super Admin" });
      }
    }

    // Process file uploads via cloudinary worker
    const { images, videos, attachments } = await processTaskFiles(
      req.files || {},
    );

    const newTask = await Task.create({
      title: title.trim(),
      description: description.trim(),
      taskStatus: taskStatus || "Open",
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

    // Add task to project's tasks array
    if (project) {
      const Project = require("../models/Project");
      await Project.findByIdAndUpdate(project, {
        $addToSet: { tasks: newTask._id },
      }).catch((e) =>
        console.warn("Warning: could not add task to project tasks array", e),
      );
    }

    // Send email notification to project team when a task is assigned to a project
    if (project) {
      const Project = require("../models/Project");
      const assignedProject = await Project.findById(project)
        .populate("team", "email")
        .lean();
      if (
        assignedProject &&
        assignedProject.team &&
        assignedProject.team.length > 0
      ) {
        for (const member of assignedProject.team) {
          if (member.email) {
            await emailQueue.add({
              to: member.email,
              subject: "New Task Assigned to Project",
              text: `A new task has been assigned to the project "${assignedProject.name}":\n\nTitle: ${newTask.title}\nStatus: ${newTask.taskStatus}\n\nPlease login to view the details.`,
            });
          }
        }
      }
    } else if (assignedTo) {
      // Fallback: Notify individual if task is not in a project but assigned to them
      const assignedUser = await User.findById(assignedTo).lean();
      if (assignedUser?.email) {
        await emailQueue.add({
          to: assignedUser.email,
          subject: "New Task Assigned",
          text: `You have been assigned a new task:\n\nTitle: ${newTask.title}\nStatus: ${newTask.taskStatus}\n\nPlease login to view the details.`,
        });
      }
    }

    req.app.get("io")?.emit("taskUpdated");
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Create Task Error:", error);
    if (error.message?.includes("End date cannot be before start date")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error creating task" });
  }
};

/* =====================================================
   UPDATE TASK
===================================================== */
exports.updateTask = async (req, res) => {
  try {
    const user = req.user;
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ message: "Task not found" });

    const userPermissions = (user.role?.permissions || [])
      .filter((p) => p && p.status !== "Inactive")
      .map((p) => p.name);

    const isSuperAdmin = user.role?.name === "Super Admin";
    const hasEditPerm = isSuperAdmin || userPermissions.includes("Edit Task");
    const isOnlyViewer = userPermissions.includes("View Task") && !hasEditPerm;
    const isAssignedUser =
      task.assignedTo && String(task.assignedTo) === String(user._id);

    // Only-viewer who is not the assigned user cannot edit
    if (isOnlyViewer && !isAssignedUser) {
      return res.status(403).json({ message: "Not allowed to edit this task" });
    }

    let {
      taskStatus = task.taskStatus,
      assignedTo,
      existingImages,
      existingVideos,
      existingAttachments,
      project,
    } = req.body;

    // Normalize empty strings to null
    if (assignedTo === "" || assignedTo === "null") assignedTo = null;
    if (project === "" || project === "null") project = null;

    // Parse existing media arrays safely
    let parsedExistingImages = [];
    let parsedExistingVideos = [];
    let parsedExistingAttachments = [];

    try {
      parsedExistingImages = existingImages ? JSON.parse(existingImages) : [];
      parsedExistingVideos = existingVideos ? JSON.parse(existingVideos) : [];
      parsedExistingAttachments = existingAttachments
        ? JSON.parse(existingAttachments)
        : [];
    } catch {
      return res.status(400).json({ message: "Invalid existing media format" });
    }

    // Process new file uploads
    const {
      images: newImages,
      videos: newVideos,
      attachments: newAttachments,
    } = await processTaskFiles(req.files || {});

    const finalImages = [...parsedExistingImages, ...newImages];
    const finalVideos = [...parsedExistingVideos, ...newVideos];
    const finalAttachments = [...parsedExistingAttachments, ...newAttachments];

    // Build explicit update object
    let updateData = {
      taskStatus,
      assignedTo,
      project,
      images: finalImages,
      videos: finalVideos,
      attachments: finalAttachments,
    };

    // Include other updatable fields if present in body
    const otherFields = [
      "title",
      "description",
      "startDate",
      "endDate",
      "notes",
      "isActive",
    ];
    otherFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) {
        updateData[f] = req.body[f];
      }
    });

    // If user is only a viewer but is the assigned user → restrict to taskStatus only
    if (isOnlyViewer && isAssignedUser) {
      updateData = { taskStatus };
    }

    // Date validation
    const effectiveStart = updateData.startDate || task.startDate;
    const effectiveEnd = updateData.endDate || task.endDate;
    if (
      effectiveStart &&
      effectiveEnd &&
      new Date(effectiveEnd) < new Date(effectiveStart)
    ) {
      return res
        .status(400)
        .json({ message: "End date cannot be before start date" });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    // Sync project task lists if project changed
    const oldProjectId = task.project ? String(task.project) : null;
    const newProjectId = project ? String(project) : null;

    if (oldProjectId !== newProjectId) {
      const Project = require("../models/Project");
      if (oldProjectId) {
        await Project.findByIdAndUpdate(oldProjectId, {
          $pull: { tasks: updatedTask._id },
        }).catch(() => {});
      }
      if (newProjectId) {
        await Project.findByIdAndUpdate(newProjectId, {
          $addToSet: { tasks: updatedTask._id },
        }).catch(() => {});
      }
    }

    // Email notification if task was added to a new project
    if (newProjectId && oldProjectId !== newProjectId) {
      const Project = require("../models/Project");
      const assignedProject = await Project.findById(newProjectId)
        .populate("team", "email")
        .lean();
      if (
        assignedProject &&
        assignedProject.team &&
        assignedProject.team.length > 0
      ) {
        for (const member of assignedProject.team) {
          if (member.email) {
            await emailQueue.add({
              to: member.email,
              subject: "Task Added to Project",
              text: `A task has been added to the project "${assignedProject.name}":\n\nTitle: ${updatedTask.title}\nStatus: ${updatedTask.taskStatus}\n\nPlease login to view the details.`,
            });
          }
        }
      }
    } else if (
      !newProjectId &&
      assignedTo &&
      String(assignedTo) !== String(task.assignedTo)
    ) {
      // Email individual if task is not in a project but got reassigned
      const reassignedUser = await User.findById(assignedTo).lean();
      if (reassignedUser?.email) {
        await emailQueue.add({
          to: reassignedUser.email,
          subject: "Task Assigned to You",
          text: `A task has been assigned to you:\n\nTitle: ${updatedTask.title}\nStatus: ${updatedTask.taskStatus}\n\nPlease login to view the details.`,
        });
      }
    }

    req.app.get("io")?.emit("taskUpdated");
    res.json(updatedTask);
  } catch (error) {
    console.error("Update Task Error:", error);
    if (error.message?.includes("End date cannot be before start date")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error updating task" });
  }
};

/* =====================================================
   GET ALL TASKS (PAGINATED + ROLE BASED)
===================================================== */
exports.getTasks = async (req, res) => {
  try {
    const user = req.user;
    const isSuperAdmin = user.role?.name === "Super Admin";
    const projectFilter = String(req.query.project || "").trim();
    const Project = require("../models/Project");

    let filter = {};

    if (!isSuperAdmin) {
      const userProjects = await Project.find({ team: user._id })
        .select("_id")
        .lean();
      const projectIds = userProjects.map((p) => p._id);

      filter.$or = [{ assignedTo: user._id }];
      if (projectIds.length) filter.$or.push({ project: { $in: projectIds } });
    }

    // Apply topbar-selected project filter for all users.
    if (projectFilter) {
      let projectClause;

      if (mongoose.Types.ObjectId.isValid(projectFilter)) {
        projectClause = { project: projectFilter };
      } else {
        const matchingProjects = await Project.find({
          name: { $regex: new RegExp(`^${projectFilter}$`, "i") },
        })
          .select("_id")
          .lean();
        projectClause = {
          project: { $in: matchingProjects.map((p) => p._id) },
        };
      }

      filter =
        Object.keys(filter).length === 0
          ? projectClause
          : { $and: [filter, projectClause] };
    }

    // Search
    if (req.query.search) {
      const searchFilter = {
        $or: [
          { title: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
        ],
      };
      filter =
        Object.keys(filter).length === 0
          ? searchFilter
          : { $and: [filter, searchFilter] };
    }

    if (req.query.taskStatus) filter.taskStatus = req.query.taskStatus;
    if (req.query.isActive === "true") filter.isActive = true;
    if (req.query.isActive === "false") filter.isActive = false;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [totalTasks, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .populate("assignedTo", "email name")
        .populate("createdBy", "email name")
        .populate("project", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
    });
  } catch (error) {
    console.error("Get Tasks Error:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
};

/* =====================================================
   GET SINGLE TASK BY ID
===================================================== */
const Issue = require("../models/Issue");

exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "email name")
      .populate("createdBy", "email name")
      .populate("project", "name")
      .lean();

    if (!task) return res.status(404).json({ message: "Task not found" });

    // Include related issues
    const issues = await Issue.find({ task: task._id })
      .populate("reportedBy", "email name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ...task, issues });
  } catch (err) {
    console.error("Get Task By ID Error:", err);
    res.status(500).json({ message: "Error fetching task" });
  }
};

/* =====================================================
   DELETE TASK
===================================================== */
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).lean();
    if (!task) return res.status(404).json({ message: "Task not found" });

    await Task.findByIdAndDelete(req.params.id);

    // Remove task reference from its project
    if (task.project) {
      const Project = require("../models/Project");
      await Project.findByIdAndUpdate(task.project, {
        $pull: { tasks: task._id },
      }).catch(() => {});
    }

    req.app.get("io")?.emit("taskUpdated");
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    res.status(500).json({ message: "Error deleting task" });
  }
};

/* =====================================================
   GET MY TASKS
===================================================== */
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const search = req.query.search || "";
    const Project = require("../models/Project");

    let filter = {};
    const projectFilter = req.query.project;

    if (projectFilter) {
      const proj = await Project.findById(projectFilter).select("team").lean();
      if (!proj) return res.status(404).json({ message: "Project not found" });

      const isSuperAdmin = req.user.role?.name === "Super Admin";
      const isTeamMember = proj.team.some((t) => String(t) === String(userId));

      if (!isTeamMember && !isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Access denied to this project" });
      }

      filter = { project: projectFilter };
    } else {
      const userProjects = await Project.find({ team: userId })
        .select("_id")
        .lean();
      const projectIds = userProjects.map((p) => p._id);

      filter = { $or: [{ assignedTo: userId }] };
      if (projectIds.length) filter.$or.push({ project: { $in: projectIds } });
    }

    if (search) {
      const searchOr = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
      // Merge search with existing filter
      filter =
        Object.keys(filter).length === 0
          ? { $or: searchOr }
          : { $and: [filter, { $or: searchOr }] };
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [totalTasks, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .populate("assignedTo", "email name")
        .populate("createdBy", "email name")
        .populate("project", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      tasks,
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
    });
  } catch (error) {
    console.error("Get My Tasks Error:", error);
    res.status(500).json({ message: "Error fetching my tasks" });
  }
};
