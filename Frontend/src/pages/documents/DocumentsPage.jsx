import { useEffect, useState, useCallback, useMemo } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useAuth } from "../../context/AuthContext";
import {
  Button, Input, PageHeader, LoadingSpinner, FeedbackMessage
} from "../../components/common";
import ManageAccessModal from "../../components/common/ManageAccessModal";
import AccessAvatars from "../../components/documents/AccessAvatars";
import { isSuperAdmin as checkSuperAdmin } from "../../permissions/can";
import DocumentEditorModal from "./components/DocumentEditorModal";

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
  const [, setLastManualSavedAt] = useState("");
  const [hasUnsavedEditorChanges, setHasUnsavedEditorChanges] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const editorDraftKey = useMemo(
    () => `documents_editor_draft_${currentUserId || "guest"}`,
    [currentUserId],
  );

  const normalizeHtmlValue = (value = "") =>
    String(value).replace(/\s+/g, " ").trim();

  const showFeedback = (type, message) => setFeedback({ type, message });

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

    if (showToast) showFeedback("success", "Editor content saved");
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
      const res = await axiosInstance.get("/users");
      const payload = res.data;
      if (Array.isArray(payload)) setUsers(payload);
      else if (Array.isArray(payload?.users)) setUsers(payload.users);
      else setUsers([]);
    } catch (err) {
      // Users list is optional for this page. Keep UI functional even if restricted.
      if (err?.response?.status && err.response.status !== 403) {
        showFeedback("error", "Unable to load users for access management");
      }
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
    return found?.name || "Deleted User";
  };

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [fetchDocuments, fetchUsers]);

  const openDocument = (doc) => {
    const isOwner =
      String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
    const hasAccess =
      isOwner ||
      (doc.access || []).some(
        (a) => String(a.user?._id || a.user || a) === String(currentUserId),
      ) ||
      checkSuperAdmin(user);
    if (!hasAccess) {
      showFeedback(
        "warning",
        "You do not have access. You can request access.",
      );
      return;
    }
    const fileUrl =
      Array.isArray(doc.attachments) && doc.attachments.length
        ? doc.attachments[0]
        : null;
    if (fileUrl) window.open(fileUrl, "_blank");
    else showFeedback("info", "No file attached");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) {
      showFeedback("warning", "Name is required");
      return;
    }

    if (!autoSaveEnabled && hasUnsavedEditorChanges) {
      showFeedback(
        "warning",
        "Auto Save is off. Click Save Content before submitting",
      );
      return;
    }

    const finalContent = autoSaveEnabled ? editorContent : content;

    const plainEditorText = (finalContent || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
        // Update flow
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
      showFeedback("error", "Failed to save document");
    }
  };

  const requestAccess = async (docId) => {
    try {
      const res = await axiosInstance.post(
        `/documents/${docId}/request-access`,
      );
      const message = res?.data?.message || "Access request sent";
      showFeedback("success", message);
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
      await axiosInstance.post(`/documents/${docId}/grant`, {
        userId,
        accessType,
      });
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
                String(doc.createdBy?._id || doc.createdBy) ===
                String(currentUserId);
              const isSuper = checkSuperAdmin(user);
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

      <DocumentEditorModal
        showModal={showModal}
        editDoc={editDoc}
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
        setLastManualSavedAt={setLastManualSavedAt}
        setHasUnsavedEditorChanges={setHasUnsavedEditorChanges}
        editorDraftKey={editorDraftKey}
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
      />
    </div>
  );
}

export default Documents;
