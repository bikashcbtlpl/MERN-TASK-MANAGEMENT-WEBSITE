const Task = require("../models/Task");
const User = require("../models/User");

/* =====================================================
   STATUS VALIDATION HELPER
===================================================== */
const validateStatusCombo = (taskStatus, completionStatus) => {
  const openStates = ["Open", "In Progress", "On Hold"];

  if (openStates.includes(taskStatus) && completionStatus !== "Pending") {
    return "Open / In Progress / On Hold tasks must have completion status = Pending";
  }

  if (taskStatus === "Closed" && !["Completed", "Cancelled"].includes(completionStatus)) {
    return "Closed tasks must have completion status = Completed or Cancelled";
  }

  return null;
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
      images,
      videos,
      attachments,
    } = req.body;

    if (!assignedTo || assignedTo === "") assignedTo = null;

    // 🔒 Prevent assigning to Super Admin
    if (assignedTo) {
      const userToAssign = await User.findById(assignedTo).populate("role");

      if (
        userToAssign &&
        userToAssign.role.name === "Super Admin" &&
        req.user.role.name !== "Super Admin"
      ) {
        return res.status(403).json({
          message: "You cannot assign task to Super Admin",
        });
      }
    }

    // 🔥 STATUS RULE VALIDATION
    const statusError = validateStatusCombo(taskStatus, completionStatus);
    if (statusError) {
      return res.status(400).json({ message: statusError });
    }

    const newTask = await Task.create({
      title,
      description,
      taskStatus,
      completionStatus,
      assignedTo,
      startDate,
      endDate,
      notes,
      images: images || [],
      videos: videos || [],
      attachments: attachments || [],
      createdBy: req.user._id,
    });

    const io = req.app.get("io");
    if (io) io.emit("taskUpdated");

    res.status(201).json(newTask);
  } catch (error) {
    console.log("Create Task Error:", error);
    res.status(500).json({ message: "Error creating task" });
  }
};

/* =====================================================
   GET TASKS
===================================================== */
exports.getTasks = async (req, res) => {
  try {
    const user = req.user;
    let filter = {};

    const userPermissions = user.role.permissions.map((p) => p.name);

    const isOnlyViewer =
      userPermissions.includes("View Task") &&
      !userPermissions.includes("Create Task") &&
      !userPermissions.includes("Edit Task") &&
      !userPermissions.includes("Delete Task");

    if (isOnlyViewer) filter = { assignedTo: user._id };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
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
  } catch (error) {
    console.log("Get Tasks Error:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
};

/* =====================================================
   GET SINGLE TASK
===================================================== */
exports.getTaskById = async (req, res) => {
  try {
    const user = req.user;

    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "email")
      .populate("createdBy", "email");

    if (!task) return res.status(404).json({ message: "Task not found" });

    const userPermissions = user.role.permissions.map((p) => p.name);

    const isOnlyViewer =
      userPermissions.includes("View Task") &&
      !userPermissions.includes("Create Task") &&
      !userPermissions.includes("Edit Task") &&
      !userPermissions.includes("Delete Task");

    if (
      isOnlyViewer &&
      task.assignedTo &&
      task.assignedTo._id.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task" });
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

    if (isOnlyViewer) {
      return res.status(403).json({ message: "Not allowed to edit task" });
    }

    let {
      taskStatus = task.taskStatus,
      completionStatus = task.completionStatus,
      assignedTo,
    } = req.body;

    if (assignedTo === "") assignedTo = null;

    // 🔒 Prevent assigning to Super Admin
    if (assignedTo) {
      const userToAssign = await User.findById(assignedTo).populate("role");

      if (
        userToAssign &&
        userToAssign.role.name === "Super Admin" &&
        user.role.name !== "Super Admin"
      ) {
        return res.status(403).json({
          message: "You cannot assign task to Super Admin",
        });
      }
    }

    // 🔥 STATUS RULE VALIDATION
    const statusError = validateStatusCombo(taskStatus, completionStatus);
    if (statusError) {
      return res.status(400).json({ message: statusError });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        assignedTo,
        images: req.body.images || task.images,
        videos: req.body.videos || task.videos,
        attachments: req.body.attachments || task.attachments,
      },
      { returnDocument: "after", runValidators: true }
    );

    const io = req.app.get("io");
    if (io) io.emit("taskUpdated");

    res.json(updatedTask);
  } catch (error) {
    console.log("Update Task Error:", error);
    res.status(500).json({ message: "Error updating task" });
  }
};

/* =====================================================
   DELETE TASK
===================================================== */
exports.deleteTask = async (req, res) => {
  try {
    const user = req.user;
    const userPermissions = user.role.permissions.map((p) => p.name);

    if (!userPermissions.includes("Delete Task")) {
      return res.status(403).json({ message: "Not allowed to delete task" });
    }

    await Task.findByIdAndDelete(req.params.id);

    const io = req.app.get("io");
    if (io) io.emit("taskUpdated");

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task" });
  }
};

/* =====================================================
   GET MY TASKS
===================================================== */
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate("assignedTo", "email")
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    res.status(200).json(tasks);
  } catch (error) {
    console.log("Get My Tasks Error:", error);
    res.status(500).json({ message: "Error fetching my tasks" });
  }
};
