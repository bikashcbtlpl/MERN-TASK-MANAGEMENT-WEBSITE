import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

function Documents() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accessList, setAccessList] = useState([]); // array of user ids
  const [file, setFile] = useState(null);

  const [managingAccessFor, setManagingAccessFor] = useState(null);
  const [selectedGrantUser, setSelectedGrantUser] = useState("");

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
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [fetchDocuments, fetchUsers]);

  const openDocument = (doc) => {
    const isOwner = doc.createdBy?._id === user?._id || doc.createdBy === user?._id;
    const hasAccess = isOwner || (doc.access || []).some((a) => a === user?._id || a?._id === user?._id) || user?.role?.name === "Super Admin";
    if (!hasAccess) {
      toast.info("You do not have access. You can request access.");
      return;
    }
    const fileUrl = Array.isArray(doc.attachments) && doc.attachments.length ? doc.attachments[0] : null;
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
      form.append("createdBy", user?._id);
      form.append("access", JSON.stringify(accessList));
      if (file) form.append("attachments", file);

      await axiosInstance.post("/documents", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document created");
      setShowModal(false);
      setName("");
      setDescription("");
      setAccessList([]);
      setFile(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create document");
    }
  };

  const requestAccess = async (docId) => {
    try {
      await axiosInstance.post(`/documents/${docId}/request-access`);
      toast.success("Access request sent");
    } catch (err) {
      console.error(err);
      toast.error("Failed to request access");
    }
  };

  const grantAccess = async (docId) => {
    if (!selectedGrantUser) return toast.error("Select a user to grant access");
    try {
      await axiosInstance.post(`/documents/${docId}/grant`, { userId: selectedGrantUser });
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Documents</h2>
        <div>
          <button onClick={() => setShowModal(true)}>Create Document</button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
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
            {documents.map((doc) => {
              const isOwner = doc.createdBy?._id === user?._id || doc.createdBy === user?._id;
              const hasAccess = isOwner || (doc.access || []).some((a) => a === user?._id || a?._id === user?._id) || user?.role?.name === "Super Admin";
              return (
                <tr key={doc._id} style={{ borderTop: "1px solid #ddd" }}>
                  <td style={{ padding: 6 }}>{doc.name}</td>
                  <td style={{ padding: 6 }}>{doc.description}</td>
                  <td style={{ padding: 6 }}>{doc.createdBy?.name || doc.createdBy}</td>
                  <td style={{ padding: 6 }}>{(doc.access || []).map((a) => (a.name ? a.name : a)).join(", ")}</td>
                  <td style={{ padding: 6 }}>
                    <button onClick={() => openDocument(doc)}>Open</button>
                    {!hasAccess && <button onClick={() => requestAccess(doc._id)}>Request Access</button>}
                    {isOwner && (
                      <>
                        <button onClick={() => setManagingAccessFor(managingAccessFor === doc._id ? null : doc._id)}>Manage Access</button>
                        <button onClick={() => deleteDocument(doc._id)}>Delete</button>
                      </>
                    )}
                    {managingAccessFor === doc._id && (
                      <div style={{ marginTop: 6 }}>
                        <select value={selectedGrantUser} onChange={(e) => setSelectedGrantUser(e.target.value)}>
                          <option value="">Select user</option>
                          {users
                            .filter((u) => u._id !== user?._id)
                            .map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.name} ({u.email})
                              </option>
                            ))}
                        </select>
                        <button onClick={() => grantAccess(doc._id)}>Grant</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showModal && (
        <div style={{ position: "fixed", left: 0, top: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 20, width: 600, borderRadius: 6 }}>
            <h3>Create Document</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: 8 }}>
                <label>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Attach File</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label>Give Access (select multiple with Ctrl/Cmd)</label>
                <select multiple value={accessList} onChange={(e) => setAccessList(Array.from(e.target.selectedOptions, (o) => o.value))} style={{ width: "100%", height: 120 }}>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
