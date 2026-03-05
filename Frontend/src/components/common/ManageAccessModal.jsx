import React, { useState } from "react";
import Modal from "./Modal";
import { Button } from ".";

const ManageAccessModal = ({ isOpen, onClose, document, users, onGrant, onRevoke, onChangeType, onRequestAccess }) => {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedType, setSelectedType] = useState("view");

  if (!document) return null;

  // Resolve user objects where possible (document.access may contain
  // legacy id strings or { user, accessType } objects where user may be
  // an id or a populated object).
  const accessUsers = (document.access || []).map((a) => {
    const rawUser = a?.user || a; // could be user obj or id
    const resolved = typeof rawUser === "object" && rawUser !== null && (rawUser.name || rawUser.email)
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
    const resolved = users.find((x) => String(x._id) === String(u._id || u)) || u;
    return { _id: resolved._id || resolved.id || resolved, name: resolved.name || String(resolved), email: resolved.email || "" };
  });

  const usersWithoutAccess = users.filter((u) => !accessUsers.some((a) => String(a.id) === String(u._id)));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Access — ${document.name}`}
      modalStyle={{ minWidth: 520, width: "min(92vw, 860px)", padding: 24 }}
    >
      <div className="manage-access-root">
        <div className="manage-access-column">
          <h4>Current Access</h4>
          <div className="manage-access-list">
            {accessUsers.length === 0 && <div className="muted">No users have access yet.</div>}
            {accessUsers.map((a) => (
              <div key={a.id} className="manage-access-item">
                <div className="manage-access-user">
                  <strong>{a.name}</strong>
                  {a.email && <div className="muted small">{a.email}</div>}
                </div>
                <div className="manage-access-actions">
                  <select value={a.accessType} onChange={(e) => onChangeType(document._id, a.id, e.target.value)}>
                    <option value="view">View</option>
                    <option value="edit">Edit + View</option>
                  </select>
                  <Button variant="danger" size="sm" onClick={() => onRevoke(document._id, a.id)}>Revoke</Button>
                </div>
              </div>
            ))}
          </div>

          <h4 style={{ marginTop: 18 }}>Pending Requests</h4>
          <div className="manage-access-list">
            {requestUsers.length === 0 && <div className="muted">No pending requests.</div>}
            {requestUsers.map((r) => (
              <div key={(r._id || r.id)} className="manage-access-item">
                <div className="manage-access-user">
                  <strong>{r.name || r._id || r.id}</strong>
                  {r.email && <div className="muted small">{r.email}</div>}
                </div>
                <div className="manage-access-actions">
                  <Button variant="primary" size="sm" onClick={() => onGrant(document._id, r._id || r.id, "view")}>Grant View</Button>
                  <Button variant="warning" size="sm" onClick={() => onGrant(document._id, r._id || r.id, "edit")}>Grant Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="manage-access-column">
          <h4>Grant Access</h4>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <select className="full-width" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="">Select user</option>
              {usersWithoutAccess.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="view">View</option>
              <option value="edit">Edit + View</option>
            </select>
            <Button variant="primary" size="sm" onClick={() => { if (selectedUser) { onGrant(document._id, selectedUser, selectedType); setSelectedUser(""); } }}>Grant</Button>
          </div>

          <div style={{ marginTop: 30, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManageAccessModal;
