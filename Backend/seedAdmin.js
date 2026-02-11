require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Role = require("./models/Role");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // 1️⃣ Check if Admin role exists
    let adminRole = await Role.findOne({ name: "Super Admin" });

    if (!adminRole) {
      adminRole = await Role.create({
        name: "Super Admin",
        status: "Active",
        permissions: [],
      });
      console.log("Super Admin role created");
    }

    // 2️⃣ Check if admin user exists
    const existingAdmin = await User.findOne({
      email: "admin@example.com",
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash("123456", 10);

    // 4️⃣ Create admin user
    await User.create({
      email: "admin@example.com",
      password: hashedPassword,
      role: adminRole._id,
      status: "Active",
    });

    console.log("Admin user created successfully");
    process.exit();
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
}

seedAdmin();
