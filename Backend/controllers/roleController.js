const Role = require("../models/Role");

/* ================= CREATE ROLE ================= */
exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;

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


/* ================= GET ROLE BY NAME (FOR EDIT PAGE) ================= */
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
    const role = await Role.findOneAndUpdate(
      { name: req.params.roleName },
      req.body,
      { new: true }
    );

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch (error) {
    res.status(500).json({ message: "Error updating role" });
  }
};


/* ================= UPDATE ROLE BY ID (OLD SYSTEM) ================= */
exports.updateRole = async (req, res) => {
  try {
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
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: "Role deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting role" });
  }
};
