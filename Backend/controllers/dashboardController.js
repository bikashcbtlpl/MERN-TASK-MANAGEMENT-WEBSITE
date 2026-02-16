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
      roleName === "Admin" || roleName === "Super Admin";

    /* ================= ADMIN ================= */
    if (isAdmin) {

      totalUsers = await User.countDocuments();

      // ✅ Count ALL tasks (including cancelled)
      totalTasks = await Task.countDocuments();

      // ✅ Completed tasks only
      completedTasks = await Task.countDocuments({
        taskStatus: "Completed",
      });

      // ✅ Active = NOT closed AND NOT cancelled
      activeTasks = await Task.countDocuments({
        taskStatus: { $nin: ["Closed", "Cancelled"] },
      });
    }

    /* ================= NORMAL USER ================= */
    else {

      // ✅ Count ALL assigned tasks
      totalTasks = await Task.countDocuments({
        assignedTo: user._id,
      });

      // ✅ Completed tasks
      completedTasks = await Task.countDocuments({
        assignedTo: user._id,
        taskStatus: "Completed",
      });

      // ✅ Active tasks only (not closed + not cancelled)
      activeTasks = await Task.countDocuments({
        assignedTo: user._id,
        taskStatus: { $nin: ["Closed", "Cancelled"] },
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
