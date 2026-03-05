const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Role = require("./models/Role");

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // 1. Ensure Super Admin role exists
    let superAdminRole = await Role.findOne({ name: "Super Admin" });

    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "Super Admin",
        status: "Active",
        permissions: [],
      });
      console.log("✅ Super Admin role created");
    } else {
      console.log("ℹ️  Super Admin role already exists");
    }

    // 2. Check if admin user exists
    const existingAdmin = await User.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      console.log("ℹ️  Admin user already exists — skipping");
      await mongoose.connection.close();
      process.exit(0);
    }

    // 3. Hash password (use a strong default password)
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    // 4. Create admin user
    await User.create({
      name: "Super Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: superAdminRole._id,
      status: "Active",
    });

    console.log("✅ Admin user created successfully");
    console.log("   Email: admin@example.com");
    console.log(`   Password: ${defaultPassword}`);
    console.log("   ⚠️  Please change the password immediately after first login!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed Admin Error:", error);
    process.exit(1);
  }
}

seedAdmin();
