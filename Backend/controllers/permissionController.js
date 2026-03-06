const Permission = require("../models/Permission");
const Role = require("../models/Role");
const { serializePermission } = require("../utils/serializers");

/* ================= GET ALL PERMISSIONS ================= */
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ name: 1 }).lean();
    res.json(permissions.map((permission) => serializePermission(permission)));
  } catch (error) {
    console.error("Get Permissions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= CREATE PERMISSION ================= */
exports.createPermission = async (req, res) => {
  try {
    const { name, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Permission name is required" });
    }

    const existing = await Permission.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    }).lean();

    if (existing) {
      return res
        .status(400)
        .json({ message: "Permission with this name already exists" });
    }

    const permission = await Permission.create({
      name: name.trim(),
      status: status || "Active",
    });

    res.status(201).json(serializePermission(permission));
  } catch (error) {
    console.error("Create Permission Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Permission with this name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= UPDATE PERMISSION ================= */
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const existing = await Permission.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ message: "Permission not found" });
    }

    // Whitelist update fields
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updated = await Permission.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    }).lean();

    res.json(serializePermission(updated));
  } catch (error) {
    console.error("Update Permission Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Permission with this name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DELETE PERMISSION ================= */
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id).lean();
    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    // Check if any role is using this permission
    const rolesWithPermission = await Role.countDocuments({ permissions: id });
    if (rolesWithPermission > 0) {
      return res.status(400).json({
        message: `Cannot delete permission: ${rolesWithPermission} role(s) currently use it. Remove it from roles first.`,
      });
    }

    await Permission.findByIdAndDelete(id);
    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Delete Permission Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
