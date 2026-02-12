const Role = require("../models/Role");

/* ================= CREATE ROLE ================= */
exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;

    // 🚨 Only Super Admin can create Super Admin role
    if (
      name === "Super Admin" &&
      req.user.role.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can create Super Admin role",
      });
    }

    // Prevent duplicate role
    const existingRole = await Role.findOne({
      name: { $regex: `^${name}$`, $options: "i" },
    });

    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    const role = await Role.create(req.body);

    res.status(201).json(role);

  } catch (error) {
    res.status(500).json({ message: "Error creating role" });
  }
};


/* ================= GET ALL ROLES ================= */
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("permissions");
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: "Error fetching roles" });
  }
};


/* ================= GET ROLE BY NAME ================= */
exports.getRoleByName = async (req, res) => {
  try {
    const role = await Role.findOne({
      name: req.params.roleName,
    }).populate("permissions");

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);

  } catch (error) {
    res.status(500).json({ message: "Error fetching role" });
  }
};


/* ================= UPDATE ROLE BY NAME ================= */
exports.updateRoleByName = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const roleToUpdate = await Role.findOne({
      name: req.params.roleName,
    });

    if (!roleToUpdate) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 🔐 If role is Super Admin → only Super Admin can edit
    if (
      roleToUpdate.name === "Super Admin" &&
      loggedInUser.role.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can modify this role",
      });
    }

    const updatedRole = await Role.findOneAndUpdate(
      { name: req.params.roleName },
      req.body,
      { new: true }
    );

    res.json(updatedRole);

  } catch (error) {
    res.status(500).json({ message: "Error updating role" });
  }
};



/* ================= UPDATE ROLE BY ID ================= */
exports.updateRole = async (req, res) => {
  try {
    const existingRole = await Role.findById(req.params.id);

    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 🚨 Only Super Admin can edit Super Admin role
    if (
      existingRole.name === "Super Admin" &&
      req.user.role.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can update this role",
      });
    }

    const role = await Role.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(role);

  } catch (error) {
    res.status(500).json({ message: "Error updating role" });
  }
};


/* ================= DELETE ROLE ================= */
exports.deleteRole = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 🔐 Protect Super Admin role
    if (
      role.name === "Super Admin" &&
      loggedInUser.role.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can delete this role",
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({ message: "Role deleted" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting role" });
  }
};

