const Permission = require("../models/Permission");

// GET ALL
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE
exports.createPermission = async (req, res) => {
  try {
    const { name, status } = req.body;

    const existing = await Permission.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Permission already exists" });
    }

    const permission = new Permission({
      name,
      status,
    });

    await permission.save();
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE
exports.updatePermission = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Permission.findByIdAndUpdate(
      id,
      req.body,
      { returnDocument: "after" }
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE
exports.deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    await Permission.findByIdAndDelete(id);
    res.json({ message: "Permission deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
