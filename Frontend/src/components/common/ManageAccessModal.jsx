import React, { useState } from "react";

/* =====================================================
   Manage Access Modal — redesigned with a premium UI
   Props: isOpen, onClose, document, users,
          onGrant, onRevoke, onChangeType
===================================================== */

const avatarColors = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const getAvatarColor = (str = "") => {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const Avatar = ({ name = "", size = 34 }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const bg = getAvatarColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: "0.03em",
      }}
    >
      {initials || "?"}
    </div>
  );
};

const AccessBadge = ({ type }) => (
  <span
    style={{
      padding: "2px 9px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.03em",
      background: type === "edit" ? "#ede9fe" : "#e0f2fe",
      color: type === "edit" ? "#6d28d9" : "#0369a1",
      textTransform: "uppercase",
    }}
  >
    {type === "edit" ? "Edit" : "View"}
  </span>
);

const SectionTitle = ({ children }) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#94a3b8",
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);

const StyledSelect = ({ value, onChange, children, style = {} }) => (
  <select
    value={value}
    onChange={onChange}
    style={{
      padding: "7px 30px 7px 10px",
      fontSize: 13,
      borderRadius: 6,
      border: "1px solid #e2e8f0",
      background: "#fff",
      color: "#1e293b",
      cursor: "pointer",
      outline: "none",
      appearance: "none",
      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 8px center",
      backgroundSize: "14px",
      ...style,
    }}
  >
    {children}
  </select>
);

const ManageAccessModal = ({
  isOpen,
  onClose,
  document,
  users,
  onGrant,
  onRevoke,
  onChangeType,
}) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedType, setSelectedType] = useState("view");

  if (!isOpen || !document) return null;

  // Resolve access entries
  const accessUsers = (document.access || []).map((a) => {
    const rawUser = a?.user || a;
    const resolved =
      typeof rawUser === "object" &&
      rawUser !== null &&
      (rawUser.name || rawUser.email)
        ? rawUser
        : users.find((u) => String(u._id) === String(rawUser)) || rawUser;
    return {
      id: resolved?._id || resolved,
      name: resolved?.name || String(resolved),
      email: resolved?.email || "",
      accessType: a.accessType || a.type || "view",
    };
  });

  const requestUsers = (document.accessRequests || []).map((u) => {
    const resolved =
      users.find((x) => String(x._id) === String(u._id || u)) || u;
    return {
      _id: resolved._id || resolved.id || resolved,
      name: resolved.name || String(resolved),
      email: resolved.email || "",
    };
  });

  const usersWithoutAccess = users.filter(
    (u) => !accessUsers.some((a) => String(a.id) === String(u._id)),
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          width: "100%",
          maxWidth: 780,
          boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fafbfd",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                Manage Access
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>
                {document.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f1f5f9",
              width: 32,
              height: 32,
              borderRadius: 8,
              cursor: "pointer",
              color: "#64748b",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            minHeight: 320,
          }}
        >
          {/* Left: Current Access + Pending */}
          <div
            style={{ padding: "20px 24px", borderRight: "1px solid #f1f5f9" }}
          >
            <SectionTitle>Current Access ({accessUsers.length})</SectionTitle>

            {accessUsers.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "28px 0",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                No users have access yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {accessUsers.map((a) => (
                  <div
                    key={String(a.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      border: "1px solid #f1f5f9",
                      borderRadius: 10,
                      background: "#fafbfd",
                    }}
                  >
                    <Avatar name={a.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {a.name}
                      </div>
                      {a.email && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {a.email}
                        </div>
                      )}
                    </div>
                    <StyledSelect
                      value={a.accessType}
                      onChange={(e) =>
                        onChangeType(document._id, a.id, e.target.value)
                      }
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </StyledSelect>
                    <button
                      onClick={() => onRevoke(document._id, a.id)}
                      style={{
                        border: "none",
                        background: "#fee2e2",
                        color: "#ef4444",
                        borderRadius: 6,
                        padding: "5px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fecaca")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#fee2e2")
                      }
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pending requests */}
            {requestUsers.length > 0 && (
              <>
                <SectionTitle style={{ marginTop: 20 }}>
                  Pending Requests ({requestUsers.length})
                </SectionTitle>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {requestUsers.map((r) => (
                    <div
                      key={String(r._id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        border: "1px dashed #fbbf24",
                        borderRadius: 10,
                        background: "#fffbeb",
                      }}
                    >
                      <Avatar name={r.name} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          {r.name}
                        </div>
                        {r.email && (
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>
                            {r.email}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => onGrant(document._id, r._id, "view")}
                          style={{
                            border: "none",
                            background: "#e0f2fe",
                            color: "#0369a1",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => onGrant(document._id, r._id, "edit")}
                          style={{
                            border: "none",
                            background: "#ede9fe",
                            color: "#6d28d9",
                            borderRadius: 6,
                            padding: "5px 10px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right: Grant Access */}
          <div style={{ padding: "20px 24px" }}>
            <SectionTitle>Grant Access</SectionTitle>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Select User
                </label>
                <StyledSelect
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">— choose a user —</option>
                  {usersWithoutAccess.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </StyledSelect>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Access Level
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["view", "edit"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      style={{
                        flex: 1,
                        padding: "8px 0",
                        borderRadius: 8,
                        border:
                          selectedType === type
                            ? "2px solid #4f46e5"
                            : "2px solid #e2e8f0",
                        background: selectedType === type ? "#eef2ff" : "#fff",
                        color: selectedType === type ? "#4f46e5" : "#64748b",
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {type === "view" ? "👁 View only" : "✏️ Can edit"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (selectedUser) {
                    onGrant(document._id, selectedUser, selectedType);
                    setSelectedUser("");
                    setSelectedType("view");
                  }
                }}
                disabled={!selectedUser}
                style={{
                  marginTop: 4,
                  padding: "10px 0",
                  borderRadius: 8,
                  border: "none",
                  background: selectedUser
                    ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                    : "#e2e8f0",
                  color: selectedUser ? "#fff" : "#94a3b8",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: selectedUser ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                  width: "100%",
                }}
              >
                Grant Access
              </button>
            </div>

            {/* Stats summary */}
            {accessUsers.length > 0 && (
              <div
                style={{
                  marginTop: 24,
                  padding: 14,
                  borderRadius: 10,
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#94a3b8",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Summary
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#4f46e5",
                      }}
                    >
                      {accessUsers.length}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Has access
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#0ea5e9",
                      }}
                    >
                      {
                        accessUsers.filter((a) => a.accessType === "view")
                          .length
                      }
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      View only
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#8b5cf6",
                      }}
                    >
                      {
                        accessUsers.filter((a) => a.accessType === "edit")
                          .length
                      }
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Can edit
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            background: "#fafbfd",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#374151",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageAccessModal;
