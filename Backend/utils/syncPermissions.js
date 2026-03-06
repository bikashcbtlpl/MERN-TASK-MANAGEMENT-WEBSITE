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

  // Backward-compatible RBAC migration:
  // roles that already had Task CRUD get equivalent Document CRUD.
  const permissionDocs = await Permission.find({
    name: {
      $in: [
        "View Task",
        "Create Task",
        "Edit Task",
        "Delete Task",
        "View Document",
        "Create Document",
        "Edit Document",
        "Delete Document",
      ],
    },
  })
    .select("_id name")
    .lean();

  const permByName = permissionDocs.reduce((acc, p) => {
    acc[p.name] = String(p._id);
    return acc;
  }, {});

  const mapping = [
    ["View Task", "View Document"],
    ["Create Task", "Create Document"],
    ["Edit Task", "Edit Document"],
    ["Delete Task", "Delete Document"],
  ];

  const roles = await Role.find({}).populate("permissions", "name");
  for (const role of roles) {
    const rolePermNameSet = new Set((role.permissions || []).map((p) => p?.name));
    const rolePermIdSet = new Set((role.permissions || []).map((p) => String(p?._id || p)));

    let changed = false;
    mapping.forEach(([fromName, toName]) => {
      const toId = permByName[toName];
      if (!toId) return;
      if (rolePermNameSet.has(fromName) && !rolePermIdSet.has(toId)) {
        role.permissions.push(toId);
        changed = true;
      }
    });

    if (changed) await role.save();
  }

  return {
    created: missing.length,
    total: allDefaultPermissions.length,
    superAdminSynced,
  };
};

module.exports = syncPermissions;
