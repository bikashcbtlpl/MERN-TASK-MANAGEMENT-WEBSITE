const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    if (value._id !== undefined) return String(value._id);
    if (value.id !== undefined) return String(value.id);
  }
  return String(value);
};

const serializePermission = (permission) => {
  if (!permission) return null;
  if (typeof permission === "string") return { _id: permission, name: permission };

  return {
    _id: toIdString(permission),
    name: permission.name || "",
    status: permission.status,
  };
};

const serializeRole = (role, options = {}) => {
  if (!role) return null;

  const { includePermissions = true } = options;
  const payload = {
    _id: toIdString(role),
    name: role.name || "",
    status: role.status,
  };

  if (includePermissions) {
    payload.permissions = (role.permissions || [])
      .map((permission) => serializePermission(permission))
      .filter(Boolean);
  }

  return payload;
};

const serializeUserBasic = (user) => {
  if (!user) return null;

  return {
    _id: toIdString(user),
    name: user.name || "",
    email: user.email || "",
  };
};

const serializeUser = (user, options = {}) => {
  if (!user) return null;

  const { includeRole = true } = options;

  const payload = {
    _id: toIdString(user),
    name: user.name || "",
    email: user.email || "",
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (includeRole) {
    if (user.role && typeof user.role === "object" && (user.role.name || user.role._id)) {
      payload.role = serializeRole(user.role, { includePermissions: false });
    } else {
      payload.role = user.role ? { _id: toIdString(user.role) } : null;
    }
  }

  return payload;
};

const serializeAuthUser = (user) => {
  if (!user) return null;

  const permissions = (user.role?.permissions || [])
    .map((p) => (typeof p === "string" ? p : p?.name))
    .filter(Boolean);

  return {
    id: toIdString(user),
    _id: toIdString(user),
    name: user.name || "",
    email: user.email || "",
    role: user.role?.name || null,
    permissions,
  };
};

const serializeProject = (project, options = {}) => {
  if (!project) return null;

  const { includeTeam = true } = options;
  const payload = {
    _id: toIdString(project),
    name: project.name || "",
    description: project.description || "",
    deadline: project.deadline || null,
    status: project.status || "active",
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };

  if (includeTeam) {
    payload.team = (project.team || [])
      .map((member) => serializeUserBasic(member))
      .filter(Boolean);
  }

  return payload;
};

const serializeTaskUser = (user) => {
  if (!user) return null;
  if (typeof user === "string") return { _id: user };

  return {
    _id: toIdString(user),
    name: user.name || "",
    email: user.email || "",
  };
};

const serializeTaskProject = (project) => {
  if (!project) return null;
  if (typeof project === "string") return { _id: project };

  return {
    _id: toIdString(project),
    name: project.name || "",
  };
};

const serializeTask = (task) => {
  if (!task) return null;

  return {
    _id: toIdString(task),
    title: task.title || "",
    description: task.description || "",
    taskStatus: task.taskStatus || "Open",
    isActive: Boolean(task.isActive),
    startDate: task.startDate || null,
    endDate: task.endDate || null,
    notes: task.notes || "",
    images: Array.isArray(task.images) ? task.images : [],
    videos: Array.isArray(task.videos) ? task.videos : [],
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    createdBy: serializeTaskUser(task.createdBy),
    project: serializeTaskProject(task.project),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

const serializeIssue = (issue) => {
  if (!issue) return null;

  return {
    _id: toIdString(issue),
    task: issue.task && typeof issue.task === "object"
      ? { _id: toIdString(issue.task), title: issue.task.title || "" }
      : issue.task
        ? { _id: toIdString(issue.task) }
        : null,
    reportedBy: serializeTaskUser(issue.reportedBy),
    title: issue.title || "",
    description: issue.description || "",
    status: issue.status || "Open",
    isActive: issue.isActive !== undefined ? Boolean(issue.isActive) : true,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
};

const serializeDocumentAccessEntry = (entry) => {
  if (!entry) return null;

  const user = entry.user || entry;
  const serializedUser = serializeUserBasic(user);
  if (!serializedUser) return null;

  return {
    user: serializedUser,
    accessType: entry.accessType || entry.type || "view",
  };
};

const serializeDocument = (document, options = {}) => {
  if (!document) return null;

  const {
    includeContent = true,
    includeAttachments = true,
    includeAccess = true,
    includeAccessRequests = true,
  } = options;

  const payload = {
    _id: toIdString(document),
    name: document.name || "",
    description: document.description || "",
    createdBy: serializeUserBasic(document.createdBy),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };

  if (includeContent) payload.content = document.content || "";
  if (includeAttachments) {
    payload.attachments = Array.isArray(document.attachments)
      ? document.attachments
      : [];
  }
  if (includeAccess) {
    payload.access = (document.access || [])
      .map((entry) => serializeDocumentAccessEntry(entry))
      .filter(Boolean);
  }
  if (includeAccessRequests) {
    payload.accessRequests = (document.accessRequests || [])
      .map((user) => serializeUserBasic(user))
      .filter(Boolean);
  }

  return payload;
};

module.exports = {
  serializePermission,
  serializeRole,
  serializeUser,
  serializeAuthUser,
  serializeProject,
  serializeTask,
  serializeIssue,
  serializeDocument,
  serializeUserBasic,
};
