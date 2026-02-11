const Task = require("../models/Task");

// ================= CREATE TASK =================
exports.createTask = async (req, res) => {
  try {
    let { title, description, status, assignedTo } = req.body;

    // 🔥 IMPORTANT FIX
    if (!assignedTo) {
      assignedTo = null;
    }

    const newTask = await Task.create({
      title,
      description,
      status,
      assignedTo,
      createdBy: req.user.userId,
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.log("Create Task Error:", error);
    res.status(500).json({ message: "Error creating task" });
  }
};


// ================= GET ALL TASKS =================
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
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
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "email")
      .populate("createdBy", "email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task" });
  }
};

// ================= UPDATE TASK =================
exports.updateTask = async (req, res) => {
  try {
    let { assignedTo } = req.body;

    if (!assignedTo) {
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
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task" });
  }
};
