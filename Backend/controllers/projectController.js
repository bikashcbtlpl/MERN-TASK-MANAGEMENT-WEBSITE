const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

// Create a new project
exports.createProject = async (req, res) => {
  try {
    const { name, description, deadline, status, team } = req.body;
    const project = new Project({
      name,
      description,
      deadline,
      status,
      team
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all projects (optionally filter by user)
exports.getProjects = async (req, res) => {
  try {
    const user = req.user;
    const perms = (user?.role?.permissions || []).map((p) => p.name);
    const canViewAll = user?.role?.name === "Super Admin" || perms.includes("View Project");

    // Server-side search & pagination
    const search = req.query.search || "";
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const skip = (page - 1) * limit;

    let baseFilter = {};

    if (!canViewAll) {
      // restrict to projects where user is a team member
      baseFilter.team = user._id;
    }

    if (search) {
      const regex = { $regex: search, $options: "i" };
      baseFilter.$or = [{ name: regex }, { description: regex }];
    }

    const totalProjects = await Project.countDocuments(baseFilter);
    const projects = await Project.find(baseFilter)
      .populate("team", "name username email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({ projects, totalProjects, currentPage: page, totalPages: Math.ceil(totalProjects / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single project
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('team', 'name username');
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const user = req.user;
    const perms = (user?.role?.permissions || []).map(p => p.name);
    const canViewAll = user?.role?.name === 'Super Admin' || perms.includes('View Project');

    if (canViewAll) return res.json(project);

    // Allow if user is in the project's team
    const isTeamMember = project.team.some(t => String(t._id) === String(user._id));
    if (isTeamMember) return res.json(project);

    return res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a project
exports.updateProject = async (req, res) => {
  try {
    const { name, description, deadline, status, team } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, deadline, status, team },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a project
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    // Unset project reference from tasks that belonged to this project
    try {
      await Task.updateMany({ project: project._id }, { $unset: { project: "" } });
    } catch (e) {
      console.log('Warning: failed to unset project from tasks', e);
    }

    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
