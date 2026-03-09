import { useEffect, useState, useCallback, useRef } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import {
  Button, Input, PageHeader, LoadingSpinner, FeedbackMessage
} from "../../components/common";
import ManageAccessModal from "../../components/common/ManageAccessModal";
import AccessAvatars from "../../components/documents/AccessAvatars";
import { isSuperAdmin as checkSuperAdmin } from "../../permissions/can";
import DocumentEditorModal from "./components/DocumentEditorModal";

/* ── helpers ── */
const getPlainText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeHtmlValue = (value = "") =>
  String(value).replace(/\s+/g, " ").trim();

function Documents() {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  /* ── modal state ── */
  const [showModal, setShowModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [isViewOnlyModal, setIsViewOnlyModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [content, setContent] = useState("");
  const [accessList, setAccessList] = useState([]);
  const [file, setFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  /* ── auto-save state ── */
  // Bootstrap from server preference (user.preferences.autoSaveDocuments)
  const [autoSaveEnabled, setAutoSaveEnabledState] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // idle|saving|saved|error
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState("");
  const [hasUnsavedEditorChanges, setHasUnsavedEditorChanges] = useState(false);

  // Sync autoSaveEnabled from user preferences when user loads
  useEffect(() => {
    if (user?.preferences?.autoSaveDocuments !== undefined) {
      setAutoSaveEnabledState(Boolean(user.preferences.autoSaveDocuments));
    }
  }, [user?._id]);

  // Wrap setter so every toggle also persists to the server
  const setAutoSaveEnabled = useCallback(async (val) => {
    const next = Boolean(val);
    setAutoSaveEnabledState(next);
    try {
      await axiosInstance.put("/settings/preferences", { autoSaveDocuments: next });
    } catch (err) {
      console.warn("Failed to save autoSave preference:", err?.message);
    }
  }, []);

  /* ── access modals ── */
  const [showManageModalFor, setShowManageModalFor] = useState(null);
  const [accessPopupDocId, setAccessPopupDocId] = useState(null);

  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const autoSaveTimerRef = useRef(null);
  const showFeedback = (type, message) => setFeedback({ type, message });

  /* ============================================================
     DATA FETCHING
  ============================================================ */
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/documents");
      setDocuments(res.data || []);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    const endpoints = ["/documents/access-users", "/users/for-access", "/users"];
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const res = await axiosInstance.get(endpoint);
        const payload = res.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.users) ? payload.users : [];
        setUsers(list.filter((u) => u?.role?.name !== "Super Admin"));
        return;
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError?.response?.status && lastError.response.status !== 403) {
      showFeedback("error", "Unable to load users for access management");
    }
    setUsers([]);
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [fetchDocuments, fetchUsers]);

  /* ============================================================
     AUTO-SAVE — API ONLY (no localStorage)
     Fires 1.5 s after the user stops typing when autoSave is on.
     For existing docs  → PUT /documents/:id
     For new docs       → POST /documents to create, then switch to PUT
  ============================================================ */
  useEffect(() => {
    if (!showModal || !autoSaveEnabled || isViewOnlyModal) return;
    if (!hasUnsavedEditorChanges) return;

    setAutoSaveStatus("idle");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      const plainText = getPlainText(editorContent);
      if (!plainText) {
        // Nothing to save yet
        setAutoSaveStatus("idle");
        setHasUnsavedEditorChanges(false);
        return;
      }

      setAutoSaveStatus("saving");
      try {
        const form = new FormData();
        form.append("content", editorContent);

        if (editDoc?._id) {
          // Existing document — update via PUT
          form.append("name", name || editDoc.name || "Untitled");
          form.append("description", description || "");
          await axiosInstance.put(`/documents/${editDoc._id}`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          // New document — create via POST, then track its _id for future saves
          form.append("name", name || "Untitled");
          form.append("description", description || "");
          form.append("access", JSON.stringify(accessList));
          const res = await axiosInstance.post("/documents", form, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          // Backend returns the serialized doc object directly
          const created = res.data;
          if (created?._id) {
            setEditDoc(created);
            fetchDocuments();
          }
        }

        setAutoSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed:", err);
        setAutoSaveStatus("error");
      }

      setContent(editorContent);
      setHasUnsavedEditorChanges(false);
      setLastAutoSavedAt(new Date().toLocaleTimeString());
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    editorContent,
    autoSaveEnabled,
    showModal,
    isViewOnlyModal,
    editDoc,
    hasUnsavedEditorChanges,
    name,
    description,
    accessList,
  ]);

  /* ============================================================
     MANUAL SAVE (Save Content button — only shown when autoSave off)
  ============================================================ */
  const saveEditorContent = async (showToast = true) => {
    setContent(editorContent);
    setHasUnsavedEditorChanges(false);

    try {
      const form = new FormData();
      form.append("content", editorContent);

      if (editDoc?._id) {
        form.append("name", name || editDoc.name || "Untitled");
        form.append("description", description || "");
        await axiosInstance.put(`/documents/${editDoc._id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        // Auto-create if no document yet
        const plainText = getPlainText(editorContent);
        if (!plainText) {
          if (showToast) showFeedback("info", "Write some content first");
          return;
        }
        form.append("name", name || "Untitled");
        form.append("description", description || "");
        form.append("access", JSON.stringify(accessList));
        const res = await axiosInstance.post("/documents", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // Backend returns the serialized doc object directly
        const created = res.data;
        if (created?._id) {
          setEditDoc(created);
          fetchDocuments();
        }
      }

      if (showToast) showFeedback("success", "Editor content saved");
    } catch (err) {
      console.error("Manual save to API failed:", err);
      showFeedback("error", "Save failed — check your connection");
    }
  };

  /* ============================================================
     ACCESS HELPERS
  ============================================================ */
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
    return found?.name || "Deleted User";
  };

  const toggleAccessUser = (userId) => {
    const normalized = String(userId);
    setAccessList((prev) =>
      prev.includes(normalized)
        ? prev.filter((id) => id !== normalized)
        : [...prev, normalized],
    );
  };

  /* ============================================================
     MODAL OPENERS / CLOSERS
  ============================================================ */
  const resetModalState = () => {
    setName("");
    setDescription("");
    setContent("");
    setEditorContent("");
    setAccessList([]);
    setFile(null);
    setLastAutoSavedAt("");
    setHasUnsavedEditorChanges(false);
    setAutoSaveStatus("idle");
    setFileInputKey((k) => k + 1);
  };

  const openEditorModalForDoc = (doc, viewOnly = false) => {
    setShowManageModalFor(null);
    setEditDoc(doc);
    setIsViewOnlyModal(viewOnly);
    setName(doc.name || "");
    setDescription(doc.description || "");
    const initialContent = doc.content || "";
    setContent(initialContent);
    setEditorContent(initialContent);
    setHasUnsavedEditorChanges(false);
    setAutoSaveStatus("idle");
    setLastAutoSavedAt("");
    setAccessList(
      (doc.access || []).map((a) => String(a.user?._id || a.user || a)),
    );
    setFileInputKey((k) => k + 1);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setAccessPopupDocId(null);
    setEditDoc(null);
    setIsViewOnlyModal(false);
    resetModalState();
    setShowModal(true);
  };

  const cancelModal = () => {
    setShowModal(false);
    setEditDoc(null);
    setIsViewOnlyModal(false);
    resetModalState();
  };

  /* ============================================================
     DOCUMENT ACTIONS
  ============================================================ */
  const openDocument = (doc) => {
    const isOwner = String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
    const hasAccess =
      isOwner ||
      (doc.access || []).some(
        (a) => String(a.user?._id || a.user || a) === String(currentUserId),
      ) ||
      checkSuperAdmin(user);
    if (!hasAccess) {
      showFeedback("warning", "You do not have access. You can request access.");
      return;
    }
    openEditorModalForDoc(doc, true);
  };

  const downloadAttachment = (doc) => {
    const isOwner = String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
    const hasAccess =
      isOwner ||
      (doc.access || []).some(
        (a) => String(a.user?._id || a.user || a) === String(currentUserId),
      ) ||
      checkSuperAdmin(user);
    if (!hasAccess) {
      showFeedback("warning", "You do not have access. You can request access.");
      return;
    }
    const fileUrl =
      Array.isArray(doc.attachments) && doc.attachments.length
        ? doc.attachments[0]
        : null;
    if (!fileUrl) { showFeedback("info", "No file attached"); return; }
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) { showFeedback("warning", "Name is required"); return; }

    if (!autoSaveEnabled && hasUnsavedEditorChanges) {
      showFeedback("warning", "Auto Save is off. Click Save Content before submitting");
      return;
    }

    const finalContent = autoSaveEnabled ? editorContent : content;
    const plainEditorText = getPlainText(finalContent);

    if (!editDoc && !file && !plainEditorText) {
      showFeedback("warning", "Upload a file or write content in the editor");
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
        await axiosInstance.put(`/documents/${editDoc._id}`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showFeedback("success", "Document updated");
      } else {
        await axiosInstance.post("/documents", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        showFeedback("success", "Document created");
      }

      setShowModal(false);
      setEditDoc(null);
      resetModalState();
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to save document");
    }
  };

  const requestAccess = async (docId) => {
    try {
      const res = await axiosInstance.post(`/documents/${docId}/request-access`);
      showFeedback("success", res?.data?.message || "Access request sent");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to request access");
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("Delete this document?")) return;
    try {
      await axiosInstance.delete(`/documents/${docId}`);
      showFeedback("success", "Document deleted");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to delete document");
    }
  };

  const grantAccessWithType = async (docId, userId, accessType = "view") => {
    try {
      await axiosInstance.post(`/documents/${docId}/grant`, { userId, accessType });
      showFeedback("success", "Access updated");
      setShowManageModalFor(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to update access");
    }
  };

  const revokeAccess = async (docId, userId) => {
    try {
      await axiosInstance.post(`/documents/${docId}/revoke`, { userId });
      showFeedback("success", "Access revoked");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showFeedback("error", "Failed to revoke access");
    }
  };

  const changeAccessType = async (docId, userId, accessType) =>
    grantAccessWithType(docId, userId, accessType);

  /* ============================================================
     DERIVED STATE
  ============================================================ */
  const selectedUsers = users.filter((u) => accessList.includes(String(u._id)));

  const filteredDocuments = documents.filter((doc) => {
    const term = searchQuery.toLowerCase();
    return (
      (doc.name || "").toLowerCase().includes(term) ||
      getPlainText(doc.description || "").toLowerCase().includes(term)
    );
  });

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="page-container">
      <FeedbackMessage
        type={feedback.type}
        message={feedback.message}
        onClose={() => setFeedback({ type: "", message: "" })}
      />

      <PageHeader
        title="Documents"
        btnLabel="+ Create Document"
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
                String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
              const isSuper = checkSuperAdmin(user);
              const accessType = getAccessTypeForUser(doc, currentUserId);
              const hasAccess = isOwner || isSuper || !!accessType;
              const canEditDoc = isOwner || isSuper || accessType === "edit";
              return (
                <tr key={doc._id} style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: 6 }}>{doc.name}</td>
                  <td style={{ padding: 6 }}>{getPlainText(doc.description)}</td>
                  <td style={{ padding: 6 }}>
                    {doc.createdBy?.name || doc.createdBy}
                  </td>
                  <td style={{ padding: 6 }}>
                    <AccessAvatars
                      accessList={doc.access || []}
                      docId={doc._id}
                      accessPopupDocId={accessPopupDocId}
                      setAccessPopupDocId={setAccessPopupDocId}
                      resolveUserName={resolveUserName}
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
                      <Button variant="primary" size="sm" onClick={() => openDocument(doc)}>
                        Open
                      </Button>
                    )}
                    {hasAccess && (
                      <Button variant="secondary" size="sm" onClick={() => downloadAttachment(doc)}>
                        Download
                      </Button>
                    )}
                    {!hasAccess && (
                      <Button variant="secondary" size="sm" onClick={() => requestAccess(doc._id)}>
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
                        onClick={() => openEditorModalForDoc(doc)}
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

      <DocumentEditorModal
        showModal={showModal}
        editDoc={editDoc}
        isViewOnlyModal={isViewOnlyModal}
        name={name}
        setName={setName}
        description={description}
        setDescription={setDescription}
        editorContent={editorContent}
        setEditorContent={setEditorContent}
        content={content}
        autoSaveEnabled={autoSaveEnabled}
        setAutoSaveEnabled={setAutoSaveEnabled}
        lastAutoSavedAt={lastAutoSavedAt}
        hasUnsavedEditorChanges={hasUnsavedEditorChanges}
        saveEditorContent={saveEditorContent}
        setContent={setContent}
        setLastAutoSavedAt={setLastAutoSavedAt}
        setLastManualSavedAt={() => { }}
        setHasUnsavedEditorChanges={setHasUnsavedEditorChanges}
        editorDraftKey={""}
        showFeedback={showFeedback}
        fileInputKey={fileInputKey}
        setFile={setFile}
        selectedUsers={selectedUsers}
        toggleAccessUser={toggleAccessUser}
        users={users}
        accessList={accessList}
        handleCreate={handleCreate}
        cancelModal={cancelModal}
        normalizeHtmlValue={normalizeHtmlValue}
        autoSaveStatus={autoSaveStatus}
        setAutoSaveStatus={setAutoSaveStatus}
        isExistingDoc={!!editDoc?._id}
      />
    </div>
  );
}

export default Documents;
