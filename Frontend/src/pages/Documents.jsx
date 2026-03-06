import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import {
  Button,
  Input,
  PageHeader,
  LoadingSpinner,
} from "../components/common";
import ManageAccessModal from "../components/common/ManageAccessModal";

function Documents() {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [accessList, setAccessList] = useState([]); // array of user ids
  const [file, setFile] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [showManageModalFor, setShowManageModalFor] = useState(null);
  const [accessPopupDocId, setAccessPopupDocId] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    try {
      return localStorage.getItem("documents_editor_autosave") === "on";
    } catch {
      return false;
    }
  });
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState("");
  const [lastManualSavedAt, setLastManualSavedAt] = useState("");
  const [hasUnsavedEditorChanges, setHasUnsavedEditorChanges] = useState(false);

  const editorDraftKey = useMemo(
    () => `documents_editor_draft_${currentUserId || "guest"}`,
    [currentUserId],
  );

  const normalizeHtmlValue = (value = "") =>
    String(value).replace(/\s+/g, " ").trim();

  const saveEditorContent = (showToast = true) => {
    setContent(editorContent);
    setHasUnsavedEditorChanges(false);
    setLastManualSavedAt(new Date().toLocaleTimeString());

    try {
      const plain = getPlainText(editorContent);
      if (plain) localStorage.setItem(editorDraftKey, editorContent);
      else localStorage.removeItem(editorDraftKey);
    } catch {
      // Ignore local storage errors.
    }

    if (showToast) window.alert("Editor content saved");
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/documents");
      // Expecting array of documents with fields: _id, name, description, createdBy, access, attachments (array of file urls)
      setDocuments(res.data || []);
    } catch (err) {
      console.error(err);
      console.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      // Use axios directly (not axiosInstance) to avoid triggering the global
      // error toast when this user doesn't have the "View User" permission.
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
        withCredentials: true,
      });
      const payload = res.data;
      if (Array.isArray(payload)) setUsers(payload);
      else if (Array.isArray(payload?.users)) setUsers(payload.users);
      else setUsers([]);
    } catch {
      // Silently ignore — user list is optional (only needed for Manage Access modal)
      setUsers([]);
    }
  }, []);

  const getAccessTypeForUser = (doc, userId) => {
    const entry = (doc.access || []).find(
      (a) => String(a?.user?._id || a?.user || a) === String(userId),
    );
    if (!entry) return null;
    return entry.accessType || entry.type || "view";
  };

  const resolveUserName = (userRef) => {
    if (!userRef) return "";
    if (typeof userRef === "object" && userRef.name) return userRef.name;
    const found = users.find((u) => String(u._id) === String(userRef));
    return found?.name || String(userRef);
  };

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [fetchDocuments, fetchUsers]);

  // Close access popup when clicking outside
  useEffect(() => {
    if (!accessPopupDocId) return;
    const close = () => setAccessPopupDocId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [accessPopupDocId]);

  const openDocument = (doc) => {
    const isOwner =
      String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
    const hasAccess =
      isOwner ||
      (doc.access || []).some(
        (a) => String(a.user?._id || a.user || a) === String(currentUserId),
      ) ||
      user?.role?.name === "Super Admin";
    if (!hasAccess) {
      window.alert("You do not have access. You can request access.");
      return;
    }
    const fileUrl =
      Array.isArray(doc.attachments) && doc.attachments.length
        ? doc.attachments[0]
        : null;
    if (fileUrl) window.open(fileUrl, "_blank");
    else window.alert("No file attached");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) {
      window.alert("Name is required");
      return;
    }

    if (!autoSaveEnabled && hasUnsavedEditorChanges) {
      window.alert("Auto Save is off. Click Save Content before submitting");
      return;
    }

    const finalContent = autoSaveEnabled ? editorContent : content;

    const plainEditorText = (finalContent || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!editDoc && !file && !plainEditorText) {
      window.alert("Upload a file or write content in the editor");
      return;
    }

    try {
      const form = new FormData();
      form.append("name", name);
      form.append("description", description);
      form.append("content", finalContent);
      form.append("access", JSON.stringify(accessList));
      if (file) form.append("attachments", file);
      if (editDoc) {
        // Update flow
        await axiosInstance.put(`/documents/${editDoc._id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        window.alert("Document updated");
      } else {
        await axiosInstance.post("/documents", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        window.alert("Document created");
      }
      setShowModal(false);
      setName("");
      setDescription("");
      setContent("");
      setEditorContent("");
      setAccessList([]);
      setFile(null);
      setEditDoc(null);
      setLastManualSavedAt("");
      setHasUnsavedEditorChanges(false);

      if (!editDoc) {
        try {
          localStorage.removeItem(editorDraftKey);
          setLastAutoSavedAt("");
        } catch {
          // Ignore draft clearing errors.
        }
      }

      fetchDocuments();
    } catch (err) {
      console.error(err);
      window.alert("Failed to save document");
    }
  };

  const requestAccess = async (docId) => {
    try {
      const res = await axiosInstance.post(
        `/documents/${docId}/request-access`,
      );
      const message = res?.data?.message || "Access request sent";
      window.alert(message);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      window.alert("Failed to request access");
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("Delete this document?")) return;
    try {
      await axiosInstance.delete(`/documents/${docId}`);
      window.alert("Document deleted");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      window.alert("Failed to delete document");
    }
  };

  const grantAccessWithType = async (docId, userId, accessType = "view") => {
    try {
      await axiosInstance.post(`/documents/${docId}/grant`, {
        userId,
        accessType,
      });
      window.alert("Access updated");
      setShowManageModalFor(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      window.alert("Failed to update access");
    }
  };

  const revokeAccess = async (docId, userId) => {
    try {
      await axiosInstance.post(`/documents/${docId}/revoke`, { userId });
      window.alert("Access revoked");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      window.alert("Failed to revoke access");
    }
  };

  const changeAccessType = async (docId, userId, accessType) => {
    // grant endpoint will update existing entry
    await grantAccessWithType(docId, userId, accessType);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const getPlainText = (value = "") =>
    String(value)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const toggleAccessUser = (userId) => {
    const normalized = String(userId);
    setAccessList((prev) =>
      prev.includes(normalized)
        ? prev.filter((id) => id !== normalized)
        : [...prev, normalized],
    );
  };

  const selectedUsers = users.filter((u) => accessList.includes(String(u._id)));

  const filteredDocuments = documents.filter((doc) => {
    const term = searchQuery.toLowerCase();
    return (
      (doc.name || "").toLowerCase().includes(term) ||
      getPlainText(doc.description || "")
        .toLowerCase()
        .includes(term)
    );
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "documents_editor_autosave",
        autoSaveEnabled ? "on" : "off",
      );
    } catch {
      // Ignore preference persistence errors.
    }
  }, [autoSaveEnabled]);

  useEffect(() => {
    if (!showModal || !!editDoc || !autoSaveEnabled) return;

    const timeout = setTimeout(() => {
      try {
        const plainEditorText = getPlainText(editorContent);
        if (plainEditorText)
          localStorage.setItem(editorDraftKey, editorContent);
        else localStorage.removeItem(editorDraftKey);

        setContent(editorContent);
        setHasUnsavedEditorChanges(false);
        setLastAutoSavedAt(new Date().toLocaleTimeString());
      } catch {
        // Ignore autosave failures.
      }
    }, 700);

    return () => clearTimeout(timeout);
  }, [editorContent, autoSaveEnabled, showModal, editDoc, editorDraftKey]);

  // ── Avatar helpers ─────────────────────────────────────
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

  const AccessAvatars = ({ accessList, docId }) => {
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
        {/* Avatar stack */}
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
            <span
              style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}
            >
              No access
            </span>
          )}
        </div>

        {/* Popup tooltip */}
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
                    {email && (
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>
                        {email}
                      </div>
                    )}
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
              <div
                style={{ padding: "6px 14px", fontSize: 13, color: "#94a3b8" }}
              >
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
  };

  const openCreateModal = () => {
    setAccessPopupDocId(null);
    setEditDoc(null);
    setName("");
    let draft = "";
    try {
      draft = localStorage.getItem(editorDraftKey) || "";
    } catch {
      // Ignore draft loading errors.
    }
    setDescription("");
    setContent(draft);
    setEditorContent(draft);
    setAccessList([]);
    setFile(null);
    setLastManualSavedAt("");
    setHasUnsavedEditorChanges(false);
    setFileInputKey((k) => k + 1);
    setShowModal(true);
  };

  const cancelModal = () => {
    setShowModal(false);
    setEditDoc(null);
    setName("");
    setDescription("");
    setContent("");
    setEditorContent("");
    setAccessList([]);
    setFile(null);
    setLastAutoSavedAt("");
    setLastManualSavedAt("");
    setHasUnsavedEditorChanges(false);
    setFileInputKey((k) => k + 1);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Documents"
        btnLabel="Create Document"
        onBtnClick={openCreateModal}
      >
        <div className="header-search-wrapper">
          <span className="search-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="header-search"
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </PageHeader>

      {loading ? (
        <LoadingSpinner message="Loading documents..." />
      ) : (
        <table className="role-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6 }}>Name</th>
              <th style={{ textAlign: "left", padding: 6 }}>Description</th>
              <th style={{ textAlign: "left", padding: 6 }}>Created By</th>
              <th style={{ textAlign: "left", padding: 6 }}>Access</th>
              <th style={{ textAlign: "left", padding: 6 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocuments.map((doc) => {
              const isOwner =
                String(doc.createdBy?._id || doc.createdBy) ===
                String(currentUserId);
              const isSuper = user?.role?.name === "Super Admin";
              const accessType = getAccessTypeForUser(doc, currentUserId);
              const hasAccess = isOwner || isSuper || !!accessType;
              const canEditDoc = isOwner || isSuper || accessType === "edit";
              return (
                <tr key={doc._id} style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: 6 }}>{doc.name}</td>
                  <td style={{ padding: 6 }}>
                    {getPlainText(doc.description)}
                  </td>
                  <td style={{ padding: 6 }}>
                    {doc.createdBy?.name || doc.createdBy}
                  </td>
                  <td style={{ padding: 6 }}>
                    <AccessAvatars
                      accessList={doc.access || []}
                      docId={doc._id}
                    />
                  </td>
                  <td
                    style={{
                      padding: 6,
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {hasAccess && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => openDocument(doc)}
                      >
                        Open
                      </Button>
                    )}
                    {!hasAccess && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => requestAccess(doc._id)}
                      >
                        Request Access
                      </Button>
                    )}
                    {(isOwner || isSuper) && (
                      <>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() =>
                            setShowManageModalFor(
                              showManageModalFor === doc._id ? null : doc._id,
                            )
                          }
                        >
                          Manage Access
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => deleteDocument(doc._id)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                    {canEditDoc && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowManageModalFor(null); // close manage access if open
                          setEditDoc(doc);
                          setName(doc.name || "");
                          setDescription(doc.description || "");
                          setContent(doc.content || "");
                          setEditorContent(doc.content || "");
                          setLastManualSavedAt("");
                          setHasUnsavedEditorChanges(false);
                          setAccessList(
                            (doc.access || []).map((a) =>
                              String(a.user?._id || a.user || a),
                            ),
                          );
                          setFileInputKey((k) => k + 1);
                          setShowModal(true);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showManageModalFor && (
        <ManageAccessModal
          isOpen={!!showManageModalFor}
          onClose={() => setShowManageModalFor(null)}
          document={documents.find((d) => d._id === showManageModalFor)}
          users={users}
          onGrant={grantAccessWithType}
          onRevoke={revokeAccess}
          onChangeType={changeAccessType}
        />
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              width: "100%",
              maxWidth: 680,
              borderRadius: 12,
              boxShadow: "0 18px 40px rgba(2, 6, 23, 0.28)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 14 }}>
              {editDoc ? "Edit Document" : "Create Document"}
            </h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <Input
                  label="Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Input
                  as="textarea"
                  label="Description"
                  fullWidth
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontWeight: 600 }}
                >
                  Editor Content
                </label>
                <div
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: 8,
                    background: "#fff",
                  }}
                >
                  <CKEditor
                    editor={ClassicEditor}
                    data={editorContent || ""}
                    onChange={(_, editor) => {
                      const nextValue = editor.getData();
                      setEditorContent(nextValue);
                      setHasUnsavedEditorChanges(
                        normalizeHtmlValue(nextValue) !==
                          normalizeHtmlValue(content),
                      );
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoSaveEnabled}
                      onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    />
                    Auto Save editor text
                  </label>
                  {!editDoc && autoSaveEnabled && lastAutoSavedAt && (
                    <span style={{ fontSize: 12, color: "#64748b" }}>
                      Last saved at {lastAutoSavedAt}
                    </span>
                  )}
                  {!autoSaveEnabled && hasUnsavedEditorChanges && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#b45309",
                        fontWeight: 600,
                      }}
                    >
                      Unsaved editor changes
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => saveEditorContent(true)}
                  >
                    Save Content
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setEditorContent("");
                      setContent("");
                      setLastAutoSavedAt("");
                      setLastManualSavedAt("");
                      setHasUnsavedEditorChanges(false);
                      try {
                        localStorage.removeItem(editorDraftKey);
                      } catch {
                        // Ignore draft clearing errors.
                      }
                      window.alert("Editor content cleared");
                    }}
                  >
                    Clear Content
                  </Button>
                  {lastManualSavedAt && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        alignSelf: "center",
                      }}
                    >
                      Last manual save: {lastManualSavedAt}
                    </span>
                  )}
                </div>
                <p
                  style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}
                >
                  You can upload a file, write content in the editor, or use
                  both. If Auto Save is off, click Save Content before
                  submitting.
                </p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Input
                  key={fileInputKey}
                  type="file"
                  label="Attach File"
                  fullWidth
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontWeight: 600 }}
                >
                  Give Access
                </label>

                <div
                  style={{
                    minHeight: 52,
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: 8,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    background: "#f8fafc",
                    marginBottom: 10,
                  }}
                >
                  {selectedUsers.length === 0 && (
                    <span style={{ color: "#64748b", fontSize: 13 }}>
                      No users selected
                    </span>
                  )}
                  {selectedUsers.map((u) => (
                    <span
                      key={u._id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#e0e7ff",
                        color: "#1e3a8a",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {u.name}
                      <button
                        type="button"
                        onClick={() => toggleAccessUser(u._id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#1e3a8a",
                          cursor: "pointer",
                          fontWeight: 700,
                          lineHeight: 1,
                          padding: 0,
                        }}
                        aria-label={`Remove ${u.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    maxHeight: 170,
                    overflowY: "auto",
                    background: "#fff",
                    padding: 6,
                  }}
                >
                  {users.map((u) => {
                    const checked = accessList.includes(String(u._id));
                    return (
                      <button
                        key={u._id}
                        type="button"
                        onClick={() => toggleAccessUser(u._id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 10px",
                          cursor: "pointer",
                          background: checked ? "#ecfeff" : "transparent",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 13, color: "#0f172a" }}>
                          {u.name} ({u.email})
                        </span>
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: checked
                              ? "1px solid #0ea5e9"
                              : "1px solid #94a3b8",
                            background: checked ? "#0ea5e9" : "#fff",
                            color: "#fff",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {checked ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <Button variant="secondary" type="button" onClick={cancelModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editDoc ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
