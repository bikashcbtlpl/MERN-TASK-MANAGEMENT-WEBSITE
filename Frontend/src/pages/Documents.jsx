import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import { Button, Input, PageHeader, LoadingSpinner } from "../components/common";
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
  const [accessList, setAccessList] = useState([]); // array of user ids
  const [file, setFile] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [managingAccessFor, setManagingAccessFor] = useState(null);
  const [selectedGrantUser, setSelectedGrantUser] = useState("");
  const [showManageModalFor, setShowManageModalFor] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/documents");
      // Expecting array of documents with fields: _id, name, description, createdBy, access, attachments (array of file urls)
      setDocuments(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load documents");
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
      console.error(err);
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

  const openDocument = (doc) => {
    const isOwner = String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
    const hasAccess =
      isOwner ||
      (doc.access || []).some((a) => String(a.user?._id || a.user || a) === String(currentUserId)) ||
      user?.role?.name === "Super Admin";
    if (!hasAccess) {
      toast.info("You do not have access. You can request access.");
      return;
    }
    const fileUrl =
      Array.isArray(doc.attachments) && doc.attachments.length
        ? doc.attachments[0]
        : null;
    if (fileUrl) window.open(fileUrl, "_blank");
    else toast.error("No file attached");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return toast.error("Name is required");
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("description", description);
      form.append("access", JSON.stringify(accessList));
      if (file) form.append("attachments", file);
      if (editDoc) {
        // Update flow
        await axiosInstance.put(`/documents/${editDoc._id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Document updated");
      } else {
        await axiosInstance.post("/documents", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Document created");
      }
      setShowModal(false);
      setName("");
      setDescription("");
      setAccessList([]);
      setFile(null);
      setEditDoc(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create document");
    }
  };

  const requestAccess = async (docId) => {
    try {
      const res = await axiosInstance.post(`/documents/${docId}/request-access`);
      const message = res?.data?.message || "Access request sent";
      if (/already have access|already submitted/i.test(message)) {
        toast.info(message);
      } else {
        toast.success(message);
      }
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to request access");
    }
  };

  const grantAccess = async (docId) => {
    if (!selectedGrantUser) return toast.error("Select a user to grant access");
    try {
      await axiosInstance.post(`/documents/${docId}/grant`, {
        userId: selectedGrantUser,
        accessType: "view",
      });
      toast.success("Access granted");
      setManagingAccessFor(null);
      setSelectedGrantUser("");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to grant access");
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("Delete this document?")) return;
    try {
      await axiosInstance.delete(`/documents/${docId}`);
      toast.success("Document deleted");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete document");
    }
  };

  const grantAccessWithType = async (docId, userId, accessType = "view") => {
    try {
      await axiosInstance.post(`/documents/${docId}/grant`, { userId, accessType });
      toast.success("Access updated");
      setShowManageModalFor(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update access");
    }
  };

  const revokeAccess = async (docId, userId) => {
    try {
      await axiosInstance.post(`/documents/${docId}/revoke`, { userId });
      toast.success("Access revoked");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke access");
    }
  };

  const changeAccessType = async (docId, userId, accessType) => {
    // grant endpoint will update existing entry
    await grantAccessWithType(docId, userId, accessType);
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = documents.filter((doc) => {
    const term = searchQuery.toLowerCase();
    return (
      (doc.name || "").toLowerCase().includes(term) ||
      (doc.description || "").toLowerCase().includes(term)
    );
  });

  const openCreateModal = () => {
    setEditDoc(null);
    setName("");
    setDescription("");
    setAccessList([]);
    setFile(null);
    setFileInputKey((k) => k + 1);
    setShowModal(true);
  };

  const cancelModal = () => {
    setShowModal(false);
    setEditDoc(null);
    setName("");
    setDescription("");
    setAccessList([]);
    setFile(null);
    setFileInputKey((k) => k + 1);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Documents"
        btnLabel="Create Document"
        onBtnClick={openCreateModal}
      >
        <div style={{ marginRight: "16px" }}>
          <Input
            fullWidth={false}
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
        <table
          className="role-table"
          style={{ marginTop: 12 }}
        >
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
              const isOwner = String(doc.createdBy?._id || doc.createdBy) === String(currentUserId);
              const isSuper = user?.role?.name === "Super Admin";
              const accessType = getAccessTypeForUser(doc, currentUserId);
              const hasAccess = isOwner || isSuper || !!accessType;
              const canEditDoc = isOwner || isSuper || accessType === "edit";
              return (
                <tr key={doc._id} style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: 6 }}>{doc.name}</td>
                  <td style={{ padding: 6 }}>{doc.description}</td>
                  <td style={{ padding: 6 }}>
                    {doc.createdBy?.name || doc.createdBy}
                  </td>
                  <td style={{ padding: 6 }}>
                    {(doc.access || [])
                      .map((a) => {
                        const u = a.user || a;
                        const name = resolveUserName(u);
                        const type = a.accessType || a.type || "view";
                        return `${name} ${type === "edit" ? "(edit)" : "(view)"}`;
                      })
                      .join(", ")}
                  </td>
                  <td style={{ padding: 6, display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    {hasAccess && (
                      <Button variant="primary" size="sm" onClick={() => openDocument(doc)}>Open</Button>
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
                          onClick={() => setShowManageModalFor(showManageModalFor === doc._id ? null : doc._id)}
                        >
                          Manage Access
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => deleteDocument(doc._id)}>
                          Delete
                        </Button>
                      </>
                    )}
                    {canEditDoc && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditDoc(doc);
                          setName(doc.name || "");
                          setDescription(doc.description || "");
                          setAccessList((doc.access || []).map((a) => String(a.user?._id || a.user || a)));
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
          }}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              width: 600,
              borderRadius: 6,
            }}
          >
            <h3>Create Document</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 12 }}>
                <Input label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Input as="textarea" label="Description" fullWidth
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Input key={fileInputKey} type="file" label="Attach File" fullWidth
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Give Access (select multiple with Ctrl/Cmd)</label>
                <select
                  multiple
                  value={accessList}
                  onChange={(e) =>
                    setAccessList(
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                  style={{ width: "100%", height: 120 }}
                >
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
                <div
                  style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}
                >
                <Button variant="secondary" type="button" onClick={cancelModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">{editDoc ? "Save" : "Create"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
