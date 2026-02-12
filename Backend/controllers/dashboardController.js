const User = require("../models/User");
const Task = require("../models/Task");

exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;

    let totalUsers = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let activeTasks = 0;

    const roleName = user.role?.name;

    const isAdmin =
      roleName === "Admin" ||
      roleName === "Super Admin";

    // ================= ADMIN =================
    if (isAdmin) {
      totalUsers = await User.countDocuments();

      totalTasks = await Task.countDocuments();

      completedTasks = await Task.countDocuments({
        status: "Completed",
      });

      activeTasks = await Task.countDocuments({
        status: "In Progress",
      });
    }

    // ================= NORMAL USER =================
    else {
      totalUsers = 0;

      totalTasks = await Task.countDocuments({
        assignedTo: user._id,
      });

      completedTasks = await Task.countDocuments({
        assignedTo: user._id,
        status: "Completed",
      });

      activeTasks = await Task.countDocuments({
        assignedTo: user._id,
        status: "In Progress",
      });
    }

    res.json({
      totalUsers,
      totalTasks,
      completedTasks,
      activeTasks,
    });

  } catch (error) {
    console.log("Dashboard Error:", error);
    res.status(500).json({
      message: "Error fetching dashboard data",
    });
  }
};
