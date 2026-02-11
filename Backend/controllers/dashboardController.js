const User = require("../models/User");
const Task = require("../models/Task");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({
      status: "Completed",
    });

    res.json({
      totalUsers,
      totalTasks,
      completedTasks,
    });
  } catch (error) {
    console.log("Dashboard Error:", error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
};
