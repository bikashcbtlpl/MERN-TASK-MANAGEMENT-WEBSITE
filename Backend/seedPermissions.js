require("dotenv").config();
const mongoose = require("mongoose");

const Permission = require("./models/Permission");
const Role = require("./models/Role");

async function seedPermissions() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB Connected");

  const defaultPermissions = [
    // User management
    "View User",
    "Create User",
    "Edit User",
    "Delete User",
    // Role management
    "Create Role",
    "Edit Role",
    "Delete Role",
    // Permission management
    "Create Permission",
    "Edit Permission",
    "Delete Permission",
    // Project management
    "View Project",
    "Create Project",
    "Edit Project",
    "Delete Project",
    // Task management
    "View Task",
    "Create Task",
    "Edit Task",
    "Delete Task",
    // Issue management
    "View Issue",
    "Create Issue",
    "Edit Issue",
    "Delete Issue",
  ];

  const createdPermissions = [];

  for (const name of defaultPermissions) {
    let permission = await Permission.findOne({ name });

    if (!permission) {
      permission = await Permission.create({ name, status: "Active" });
      console.log("  Created permission:", name);
    } else {
      console.log("  Already exists:", name);
    }

    createdPermissions.push(permission._id);
  }

  // Attach all permissions to Super Admin role
  const superAdmin = await Role.findOne({ name: "Super Admin" });

  if (superAdmin) {
    superAdmin.permissions = createdPermissions;
    await superAdmin.save();
    console.log("✅ Super Admin updated with all permissions");
  } else {
    console.warn("⚠️  Super Admin role not found. Run seedAdmin.js first.");
  }

  console.log("✅ Permission seeding complete");
  await mongoose.connection.close();
  process.exit(0);
}

seedPermissions().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
