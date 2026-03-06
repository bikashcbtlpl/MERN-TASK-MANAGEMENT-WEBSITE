const User = require("../models/User");
const Task = require("../models/Task");
const Project = require("../models/Project");

exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;

    let totalUsers = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let activeTasks = 0;

    const roleName = user.role?.name;
    const isAdmin = roleName === "Admin" || roleName === "Super Admin";

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
    } else {
      /* ================= NORMAL USER ================= */
      const userProjects = await Project.find({ team: user._id })
        .select("_id")
        .lean();
      const projectIds = userProjects.map((p) => p._id);

      if (projectIds.length > 0) {
        // ✅ Count all tasks in the user's project teams
        totalTasks = await Task.countDocuments({
          project: { $in: projectIds },
        });

        // ✅ Completed tasks
        completedTasks = await Task.countDocuments({
          project: { $in: projectIds },
          taskStatus: "Completed",
        });

        // ✅ Active tasks only (not closed + not cancelled)
        activeTasks = await Task.countDocuments({
          project: { $in: projectIds },
          taskStatus: { $nin: ["Closed", "Cancelled"] },
        });
      }
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
