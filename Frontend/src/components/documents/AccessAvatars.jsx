const AVATAR_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const avatarColor = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

function AccessAvatars({
  accessList = [],
  docId,
  accessPopupDocId,
  setAccessPopupDocId,
  resolveUserName,
}) {
  const isOpen = accessPopupDocId === docId;
  const MAX = 3;
  const shown = accessList.slice(0, MAX);
  const extra = accessList.length - MAX;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <div
        style={{ display: "flex", cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          setAccessPopupDocId(isOpen ? null : docId);
        }}
        title="Click to see access list"
      >
        {shown.map((a, i) => {
          const u = a.user || a;
          const name = resolveUserName(u);
          const bg = avatarColor(name);
          return (
            <div
              key={i}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: bg,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                border: "2px solid #fff",
                marginLeft: i > 0 ? -8 : 0,
                zIndex: shown.length - i,
                position: "relative",
              }}
            >
              {initials(name)}
            </div>
          );
        })}
        {extra > 0 && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "#e2e8f0",
              color: "#475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 700,
              border: "2px solid #fff",
              marginLeft: -8,
            }}
          >
            +{extra}
          </div>
        )}
        {accessList.length === 0 && (
          <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
            No access
          </span>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 0,
            zIndex: 999,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "10px 0",
            minWidth: 220,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              padding: "4px 14px 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Access List
          </div>
          {accessList.map((a, i) => {
            const u = a.user || a;
            const name = resolveUserName(u);
            const email = typeof u === "object" ? u.email || "" : "";
            const type = a.accessType || a.type || "view";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: avatarColor(name),
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials(name)}
                </div>
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
                    {name}
                  </div>
                  {email && <div style={{ fontSize: 11, color: "#94a3b8" }}>{email}</div>}
                </div>
                <span
                  style={{
                    padding: "2px 7px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    background: type === "edit" ? "#ede9fe" : "#e0f2fe",
                    color: type === "edit" ? "#6d28d9" : "#0369a1",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    flexShrink: 0,
                  }}
                >
                  {type}
                </span>
              </div>
            );
          })}
          {accessList.length === 0 && (
            <div style={{ padding: "6px 14px", fontSize: 13, color: "#94a3b8" }}>
              No one has access yet.
            </div>
          )}
          <div
            style={{
              borderTop: "1px solid #f1f5f9",
              marginTop: 6,
              padding: "6px 14px 0",
            }}
          >
            <button
              onClick={() => setAccessPopupDocId(null)}
              style={{
                fontSize: 12,
                color: "#64748b",
                border: "none",
                background: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccessAvatars;
