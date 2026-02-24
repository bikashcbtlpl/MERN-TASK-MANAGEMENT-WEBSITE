require("dotenv").config();
const mongoose = require("mongoose");

const Permission = require("./models/Permission");
const Role = require("./models/Role");

async function seedPermissions() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("MongoDB Connected");

  const defaultPermissions = [
    "Create User",
    "Delete User",
    "Edit User",
    "Create Role",
    "Edit Role",
    "Delete Role",
    "Create Project",
    "Edit Project",
    "Delete Project",
    "View Project",
    "Create Task",
    "Edit Task",
    "Delete Task",
    "Create Permission",
    "Edit Permission",
    "Delete Permission",
  ];

  const createdPermissions = [];

  for (let name of defaultPermissions) {
    let permission = await Permission.findOne({ name });

    if (!permission) {
      permission = await Permission.create({ name });
      console.log("Created:", name);
    }

    createdPermissions.push(permission._id);
  }

  // Attach all permissions to Super Admin
  const superAdmin = await Role.findOne({ name: "Super Admin" });

  if (superAdmin) {
    superAdmin.permissions = createdPermissions;
    await superAdmin.save();
    console.log("Super Admin updated with all permissions");
  }

  console.log("Seeding complete");
  process.exit();
}

seedPermissions();
