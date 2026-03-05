const Project = require("../models/Project");
const Task = require("../models/Task");
const User = require("../models/User");
const emailQueue = require("../queues/emailQueue");

/* ================= CREATE PROJECT ================= */
exports.createProject = async (req, res) => {
  try {
    const { name, description, deadline, status, team } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      deadline,
      status: status || "active",
      team: team || [],
    });

    if (team && team.length > 0) {
      const users = await User.find({ _id: { $in: team } }).select("email").lean();
      for (const u of users) {
        if (u.email) {
          await emailQueue.add({
            to: u.email,
            subject: "Added to New Project",
            text: `You have been added to a new project: ${project.name}.\n\nPlease login to view the details.`,
          });
        }
      }
    }

    res.status(201).json(project);
  } catch (err) {
    console.error("Create Project Error:", err);
    res.status(500).json({ message: "Error creating project" });
  }
};

/* ================= GET ALL PROJECTS ================= */
exports.getProjects = async (req, res) => {
  try {
    const user = req.user;
    const perms = (user?.role?.permissions || []).map((p) => p.name);
    const canViewAll =
      user?.role?.name === "Super Admin" || perms.includes("View Project");

    const search = req.query.search || "";
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    let baseFilter = {};

    if (!canViewAll) {
      baseFilter.team = user._id;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      baseFilter.$or = [{ name: regex }, { description: regex }];
    }

    const [totalProjects, projects] = await Promise.all([
      Project.countDocuments(baseFilter),
      Project.find(baseFilter)
        .populate("team", "name email")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      projects,
      totalProjects,
      currentPage: page,
      totalPages: Math.ceil(totalProjects / limit),
    });
  } catch (err) {
    console.error("Get Projects Error:", err);
    res.status(500).json({ message: "Error fetching projects" });
  }
};

/* ================= GET PROJECT BY ID ================= */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("team", "name email")
      .lean();

    if (!project) return res.status(404).json({ message: "Project not found" });

    const user = req.user;
    const perms = (user?.role?.permissions || []).map((p) => p.name);
    const canViewAll =
      user?.role?.name === "Super Admin" || perms.includes("View Project");

    if (canViewAll) return res.json(project);

    const isTeamMember = project.team.some(
      (t) => String(t._id) === String(user._id),
    );
    if (isTeamMember) return res.json(project);

    return res.status(403).json({ message: "Access denied - You are not a member of this project" });
  } catch (err) {
    console.error("Get Project By ID Error:", err);
    res.status(500).json({ message: "Error fetching project" });
  }
};

/* ================= UPDATE PROJECT ================= */
exports.updateProject = async (req, res) => {
  try {
    const { name, description, deadline, status, team } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: "Project name cannot be empty" });
    }

    const oldProject = await Project.findById(req.params.id).lean();
    if (!oldProject) return res.status(404).json({ message: "Project not found" });

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (status !== undefined) updateData.status = status;
    if (team !== undefined) updateData.team = team;

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (team !== undefined) {
      const oldTeamStr = (oldProject.team || []).map(String);
      const newTeamStr = (team || []).map(String);
      const newlyAdded = newTeamStr.filter((id) => !oldTeamStr.includes(id));

      if (newlyAdded.length > 0) {
        const newUsers = await User.find({ _id: { $in: newlyAdded } }).select("email").lean();
        for (const u of newUsers) {
          if (u.email) {
            await emailQueue.add({
              to: u.email,
              subject: "Added to Project",
              text: `You have been added to the project: ${project.name}.\n\nPlease login to view the details.`,
            });
          }
        }
      }
    }

    res.json(project);
  } catch (err) {
    console.error("Update Project Error:", err);
    res.status(500).json({ message: "Error updating project" });
  }
};

/* ================= DELETE PROJECT ================= */
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Unset project reference from tasks that belonged to this project
    await Task.updateMany(
      { project: project._id },
      { $unset: { project: "" } },
    ).catch((e) => console.warn("Warning: failed to unset project from tasks", e));

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Delete Project Error:", err);
    res.status(500).json({ message: "Error deleting project" });
  }
};
