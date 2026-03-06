const Permission = require("../models/Permission");
const Role = require("../models/Role");
const { getDefaultPermissions } = require("../config/permissionCatalog");

/**
 * Ensures default permissions exist.
 * Optionally syncs all default permissions to Super Admin role.
 */
const syncPermissions = async ({ syncSuperAdmin = true } = {}) => {
  const defaultPermissions = getDefaultPermissions();
  if (!defaultPermissions.length) {
    return { created: 0, total: 0, superAdminSynced: false };
  }

  const existing = await Permission.find({
    name: { $in: defaultPermissions },
  })
    .select("_id name")
    .lean();

  const existingNames = new Set(existing.map((p) => p.name));
  const missing = defaultPermissions.filter((name) => !existingNames.has(name));

  if (missing.length) {
    await Permission.insertMany(
      missing.map((name) => ({ name, status: "Active" })),
      { ordered: false },
    ).catch((err) => {
      // Ignore duplicate-key race in concurrent startup; any other error should bubble.
      if (err?.code !== 11000) throw err;
    });
  }

  const allDefaultPermissions = await Permission.find({
    name: { $in: defaultPermissions },
  })
    .select("_id")
    .lean();

  let superAdminSynced = false;
  if (syncSuperAdmin) {
    const superAdmin = await Role.findOne({ name: "Super Admin" });
    if (superAdmin) {
      const existingRolePerms = new Set((superAdmin.permissions || []).map(String));
      let changed = false;

      allDefaultPermissions.forEach((p) => {
        const idStr = String(p._id);
        if (!existingRolePerms.has(idStr)) {
          superAdmin.permissions.push(p._id);
          changed = true;
        }
      });

      if (changed) {
        await superAdmin.save();
      }
      superAdminSynced = true;
    }
  }

  return {
    created: missing.length,
    total: allDefaultPermissions.length,
    superAdminSynced,
  };
};

module.exports = syncPermissions;
