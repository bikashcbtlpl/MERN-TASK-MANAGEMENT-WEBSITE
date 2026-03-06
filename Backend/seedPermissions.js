require("dotenv").config();

const dns = require("dns");
if (process.env.FORCE_GOOGLE_DNS === "true") {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
}

const mongoose = require("mongoose");

const Permission = require("./models/Permission");
const Role = require("./models/Role");
const { getDefaultPermissions } = require("./config/permissionCatalog");

async function seedPermissions() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is not set");
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    const canRetryWithDnsFallback =
      mongoUri.startsWith("mongodb+srv://") &&
      err?.code === "ECONNREFUSED" &&
      err?.syscall === "querySrv" &&
      process.env.MONGO_DNS_FALLBACK !== "disabled";

    if (!canRetryWithDnsFallback) throw err;

    console.warn(
      "Mongo SRV DNS resolution failed. Retrying with Google DNS fallback...",
    );
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected (DNS fallback)");
  }

  const defaultPermissions = getDefaultPermissions();

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
