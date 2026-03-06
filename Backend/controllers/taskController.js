const Task = require("../models/Task");
const mongoose = require("mongoose");
const Project = require("../models/Project");
const emailQueue = require("../queues/emailQueue");
const { canAccessTask } = require("../utils/taskAccess");
const { serializeTask, serializeIssue } = require("../utils/serializers");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* =====================================================
   NORMALIZE CLOUDINARY FILE URLS FROM MULTER
===================================================== */
const processTaskFiles = async (files = {}) => {
  return {
    images: (files.images || []).map((f) => f.path).filter(Boolean),
    videos: (files.videos || []).map((f) => f.path).filter(Boolean),
    attachments: (files.attachments || []).map((f) => f.path).filter(Boolean),
  };
};

const queueTaskEmail = (payload) => {
  Promise.resolve()
    .then(() => emailQueue.add(payload))
    .catch((e) => console.warn("[emailQueue] add failed:", e?.message || e));
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

    if (!project || project === "") project = null;

    // Date validation
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date cannot be before start date" });
    }

    // Process file uploads via cloudinary worker
    const { images, videos, attachments } = await processTaskFiles(
      req.files || {},
    );

    const newTask = await Task.create({
      title: title.trim(),
      description: description.trim(),
      taskStatus: taskStatus || "Open",
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
            queueTaskEmail({
              to: member.email,
              subject: "New Task Assigned to Project",
              text: `A new task has been assigned to the project "${assignedProject.name}":\n\nTitle: ${newTask.title}\nStatus: ${newTask.taskStatus}\n\nPlease login to view the details.`,
            });
          }
        }
      }
    }

    req.app.get("io")?.emit("taskUpdated");
    res.status(201).json(serializeTask(newTask));
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
    const isProjectMember = task.project
      ? await Project.exists({ _id: task.project, team: user._id })
      : false;

    // Without edit permission, only project team members can update task status.
    if (!hasEditPerm && !isProjectMember) {
      return res.status(403).json({ message: "Not allowed to edit this task" });
    }

    let {
      taskStatus = task.taskStatus,
      existingImages,
      existingVideos,
      existingAttachments,
      project,
    } = req.body;

    // Normalize empty strings to null
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

    // Project team members without Edit Task can only update status.
    if (!hasEditPerm && isProjectMember) {
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
      { returnDocument: "after", runValidators: true },
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
            queueTaskEmail({
              to: member.email,
              subject: "Task Added to Project",
              text: `A task has been added to the project "${assignedProject.name}":\n\nTitle: ${updatedTask.title}\nStatus: ${updatedTask.taskStatus}\n\nPlease login to view the details.`,
            });
          }
        }
      }
    }

    req.app.get("io")?.emit("taskUpdated");
    res.json(serializeTask(updatedTask));
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

    let filter = {};

    if (!isSuperAdmin) {
      const userProjects = await Project.find({ team: user._id })
        .select("_id")
        .lean();
      const projectIds = userProjects.map((p) => p._id);

      filter = projectIds.length ? { project: { $in: projectIds } } : { _id: null };
    }

    // Apply topbar-selected project filter for all users.
    if (projectFilter) {
      let projectClause;

      if (mongoose.Types.ObjectId.isValid(projectFilter)) {
        projectClause = { project: projectFilter };
      } else {
        const safeProjectFilter = escapeRegex(projectFilter);
        const matchingProjects = await Project.find({
          name: { $regex: new RegExp(`^${safeProjectFilter}$`, "i") },
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
      const safeSearch = escapeRegex(req.query.search);
      const searchFilter = {
        $or: [
          { title: { $regex: safeSearch, $options: "i" } },
          { description: { $regex: safeSearch, $options: "i" } },
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
        .populate("createdBy", "email name")
        .populate("project", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      tasks: tasks.map((task) => serializeTask(task)),
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
      .populate("createdBy", "email name")
      .populate("project", "name")
      .lean();

    if (!task) return res.status(404).json({ message: "Task not found" });

    const canView = await canAccessTask(req.user, task);
    if (!canView) {
      return res.status(403).json({
        message: "Access denied - You are not allowed to view this task",
      });
    }

    // Include related issues
    const issues = await Issue.find({ task: task._id })
      .populate("reportedBy", "email name")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      ...serializeTask(task),
      issues: issues.map((issue) => serializeIssue(issue)),
    });
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
    const isSuperAdmin = req.user.role?.name === "Super Admin";
    const userPermissions = (req.user.role?.permissions || [])
      .filter((p) => p && p.status !== "Inactive")
      .map((p) => p.name);
    const hasEditPerm = isSuperAdmin || userPermissions.includes("Edit Task");
    const search = req.query.search || "";

    let filter = {};
    const rawProjectFilter = String(req.query.project || "").trim();
    const projectFilter = ["", "all", "all projects", "null", "undefined"].includes(
      rawProjectFilter.toLowerCase(),
    )
      ? ""
      : rawProjectFilter;

    if (projectFilter) {
      let proj = null;

      if (mongoose.Types.ObjectId.isValid(projectFilter)) {
        proj = await Project.findById(projectFilter).select("team").lean();
      } else {
        const safeProjectFilter = escapeRegex(projectFilter);
        proj = await Project.findOne({
          name: { $regex: new RegExp(`^${safeProjectFilter}$`, "i") },
        })
          .select("team _id")
          .lean();
      }

      if (!proj) return res.status(404).json({ message: "Project not found" });

      const isTeamMember = proj.team.some((t) => String(t) === String(userId));

      if (!isTeamMember && !isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Access denied to this project" });
      }

      filter = { project: proj._id };
    } else {
      const userProjects = await Project.find({ team: userId })
        .select("_id")
        .lean();
      const projectIds = userProjects.map((p) => p._id);

      filter = projectIds.length ? { project: { $in: projectIds } } : { _id: null };
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      const searchOr = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
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
        .populate("createdBy", "email name")
        .populate("project", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const teamProjects = await Project.find({ team: userId }).select("_id").lean();
    const teamProjectIdSet = new Set(teamProjects.map((p) => String(p._id)));

    res.json({
      tasks: tasks.map((task) => {
        const projectId = task.project?._id || task.project;
        const canEditStatus =
          hasEditPerm ||
          (projectId ? teamProjectIdSet.has(String(projectId)) : false);

        return {
          ...serializeTask(task),
          canEditStatus,
        };
      }),
      totalTasks,
      currentPage: page,
      totalPages: Math.ceil(totalTasks / limit),
    });
  } catch (error) {
    console.error("Get My Tasks Error:", error);
    res.status(500).json({ message: "Error fetching my tasks" });
  }
};
