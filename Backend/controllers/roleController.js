const Role = require("../models/Role");
const User = require("../models/User");
const { serializeRole } = require("../utils/serializers");

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ================= CREATE ROLE ================= */
exports.createRole = async (req, res) => {
  try {
    const { name, permissions, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Role name is required" });
    }

    // Only Super Admin can create Super Admin role
    if (
      name.trim().toLowerCase() === "super admin" &&
      req.user.role?.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can create a Super Admin role",
      });
    }

    // Prevent duplicate role (case-insensitive)
    const safeRoleName = escapeRegex(name.trim());
    const existingRole = await Role.findOne({
      name: { $regex: `^${safeRoleName}$`, $options: "i" },
    }).lean();

    if (existingRole) {
      return res
        .status(400)
        .json({ message: "A role with this name already exists" });
    }

    const role = await Role.create({
      name: name.trim(),
      permissions: permissions || [],
      status: status || "Active",
    });

    const populatedRole = await Role.findById(role._id).populate("permissions").lean();
    res.status(201).json(serializeRole(populatedRole));
  } catch (error) {
    console.error("Create Role Error:", error);
    res.status(500).json({ message: "Error creating role" });
  }
};

/* ================= GET ALL ROLES ================= */
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("permissions").lean();
    res.json(roles.map((role) => serializeRole(role)));
  } catch (error) {
    console.error("Get Roles Error:", error);
    res.status(500).json({ message: "Error fetching roles" });
  }
};

/* ================= GET ROLE BY NAME ================= */
exports.getRoleByName = async (req, res) => {
  try {
    const safeRoleName = escapeRegex(req.params.roleName);
    const role = await Role.findOne({
      name: { $regex: `^${safeRoleName}$`, $options: "i" },
    })
      .populate("permissions")
      .lean();

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(serializeRole(role));
  } catch (error) {
    console.error("Get Role By Name Error:", error);
    res.status(500).json({ message: "Error fetching role" });
  }
};

/* ================= UPDATE ROLE BY NAME ================= */
exports.updateRoleByName = async (req, res) => {
  try {
    const loggedInUser = req.user;
    const safeRoleName = escapeRegex(req.params.roleName);

    const roleToUpdate = await Role.findOne({
      name: { $regex: `^${safeRoleName}$`, $options: "i" },
    }).lean();

    if (!roleToUpdate) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Only Super Admin can edit Super Admin role
    if (
      roleToUpdate.name === "Super Admin" &&
      loggedInUser.role?.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can modify the Super Admin role",
      });
    }

    // Whitelist fields
    const { permissions, status } = req.body;
    const updateData = {};
    if (permissions !== undefined) updateData.permissions = permissions;
    if (status !== undefined) updateData.status = status;

    const updatedRole = await Role.findByIdAndUpdate(
      roleToUpdate._id,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      },
    ).populate("permissions");

    res.json(serializeRole(updatedRole));
  } catch (error) {
    console.error("Update Role By Name Error:", error);
    res.status(500).json({ message: "Error updating role" });
  }
};

/* ================= UPDATE ROLE BY ID ================= */
exports.updateRole = async (req, res) => {
  try {
    const existingRole = await Role.findById(req.params.id).lean();

    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Only Super Admin can edit Super Admin role
    if (
      existingRole.name === "Super Admin" &&
      req.user.role?.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can update the Super Admin role",
      });
    }

    // Whitelist update fields
    const { name, permissions, status } = req.body;
    const updateData = {};

    if (name !== undefined) {
      // Prevent renaming to 'Super Admin' by non-super-admin
      if (
        name.trim().toLowerCase() === "super admin" &&
        req.user.role?.name !== "Super Admin"
      ) {
        return res
          .status(403)
          .json({ message: "Cannot rename role to Super Admin" });
      }
      updateData.name = name.trim();
    }

    if (permissions !== undefined) updateData.permissions = permissions;
    if (status !== undefined) updateData.status = status;

    const role = await Role.findByIdAndUpdate(req.params.id, updateData, {
      returnDocument: "after",
      runValidators: true,
    }).populate("permissions");

    res.json(serializeRole(role));
  } catch (error) {
    console.error("Update Role Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "A role with this name already exists" });
    }
    res.status(500).json({ message: "Error updating role" });
  }
};

/* ================= DELETE ROLE ================= */
exports.deleteRole = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const role = await Role.findById(req.params.id).lean();

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Protect Super Admin role
    if (
      role.name === "Super Admin" &&
      loggedInUser.role?.name !== "Super Admin"
    ) {
      return res.status(403).json({
        message: "Only Super Admin can delete the Super Admin role",
      });
    }

    // Prevent deleting a role that is currently assigned to users
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        message: `Cannot delete role: ${usersWithRole} user(s) currently have this role. Reassign them first.`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete Role Error:", error);
    res.status(500).json({ message: "Error deleting role" });
  }
};
