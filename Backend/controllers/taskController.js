const Task = require("../models/Task");

// ================= CREATE TASK =================
exports.createTask = async (req, res) => {
  try {
    let { title, description, status, assignedTo } = req.body;

    if (!assignedTo) {
      assignedTo = null;
    }

    const newTask = await Task.create({
      title,
      description,
      status,
      assignedTo,
      createdBy: req.user._id, // 🔥 fixed
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.log("Create Task Error:", error);
    res.status(500).json({ message: "Error creating task" });
  }
};


// ================= GET TASKS (ROLE BASED) =================
exports.getTasks = async (req, res) => {
  try {
    const user = req.user;

    let filter = {};

    // 🔥 If user has only View Task permission (normal user)
    const userPermissions = user.role.permissions.map(p => p.name);

    const isOnlyViewer =
      userPermissions.includes("View Task") &&
      !userPermissions.includes("Create Task") &&
      !userPermissions.includes("Edit Task") &&
      !userPermissions.includes("Delete Task");

    if (isOnlyViewer) {
      // Normal user → only see their tasks
      filter = { assignedTo: user._id };
    }

    const tasks = await Task.find(filter)
      .populate("assignedTo", "email")
      .populate("createdBy", "email");

    res.json(tasks);

  } catch (error) {
    console.log("Get Tasks Error:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
};


// ================= GET SINGLE TASK =================
exports.getTaskById = async (req, res) => {
  try {
    const user = req.user;

    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "email")
      .populate("createdBy", "email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 🔥 Security: normal user can't access others task
    const userPermissions = user.role.permissions.map(p => p.name);

    const isOnlyViewer =
      userPermissions.includes("View Task") &&
      !userPermissions.includes("Create Task") &&
      !userPermissions.includes("Edit Task") &&
      !userPermissions.includes("Delete Task");

    if (isOnlyViewer && task.assignedTo?._id.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(task);

  } catch (error) {
    res.status(500).json({ message: "Error fetching task" });
  }
};


// ================= UPDATE TASK =================
exports.updateTask = async (req, res) => {
  try {
    const user = req.user;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const userPermissions = user.role.permissions.map(p => p.name);

    const isOnlyViewer =
      userPermissions.includes("View Task") &&
      !userPermissions.includes("Edit Task");

    // 🔥 Normal user cannot edit
    if (isOnlyViewer) {
      return res.status(403).json({ message: "Not allowed to edit task" });
    }

    if (!req.body.assignedTo) {
      req.body.assignedTo = null;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updatedTask);

  } catch (error) {
    res.status(500).json({ message: "Error updating task" });
  }
};


// ================= DELETE TASK =================
exports.deleteTask = async (req, res) => {
  try {
    const user = req.user;

    const userPermissions = user.role.permissions.map(p => p.name);

    if (!userPermissions.includes("Delete Task")) {
      return res.status(403).json({ message: "Not allowed to delete task" });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: "Task deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting task" });
  }
};

// ================= GET MY TASKS =================
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user._id,
    }).populate("assignedTo", "email");

    res.status(200).json(tasks);
  } catch (error) {
    console.log("Get My Tasks Error:", error);
    res.status(500).json({
      message: "Error fetching my tasks",
    });
  }
};
