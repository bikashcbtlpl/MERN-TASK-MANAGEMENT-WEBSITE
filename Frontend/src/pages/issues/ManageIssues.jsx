import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import usePermissions from "../../hooks/usePermissions";
import { PERMS } from "../../permissions/can";
import { useAuth } from "../../context/AuthContext";
import {
    Button,
    PageHeader,
    LoadingSpinner,
    FeedbackMessage,
} from "../../components/common";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const MODULES = ["Auth", "Payment", "Dashboard", "Task", "Project", "Role", "Permission", "Other"];

const normalizeIssueStatus = (status) =>
    status === "Resolved" ? "Closed" : status;

const statusClass = (s) =>
    s === "Closed" ? "active" : s === "Open" ? "inactive" : "pending";

function ManageIssues() {
    const { can } = usePermissions();
    const { user } = useAuth();

    const canCreate =
        can(PERMS.ISSUE_CREATE) ||
        can(PERMS.TASK_VIEW) ||
        can(PERMS.TASK_CREATE) ||
        can(PERMS.TASK_EDIT);
    const canResolve = can(PERMS.ISSUE_EDIT);
    const canDelete = can(PERMS.ISSUE_DELETE);
    const canBulkUpload = can(PERMS.ISSUE_CREATE);

    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [resolvingId, setResolvingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkJobId, setBulkJobId] = useState("");
    const [bulkStatusText, setBulkStatusText] = useState("");
    const [previewUrl, setPreviewUrl] = useState("");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "High",
        module: "Auth",
    });
    const [attachmentFile, setAttachmentFile] = useState(null);

    const showFeedback = (type, message) => setFeedback({ type, message });

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            priority: "High",
            module: "Auth",
        });
        setAttachmentFile(null);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const closeBulkModal = () => {
        setShowBulkModal(false);
        setBulkFile(null);
        setBulkUploading(false);
        setBulkJobId("");
        setBulkStatusText("");
    };

    const closePreviewModal = () => {
        setPreviewUrl("");
    };

    const fetchIssues = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterStatus !== "All") params.status = filterStatus;
            const res = await axiosInstance.get("/issues", { params });
            const rawIssues = res.data?.issues || res.data || [];
            const normalizedIssues = rawIssues.map((issue) => ({
                ...issue,
                status: normalizeIssueStatus(issue.status || "Open"),
            }));
            setIssues(normalizedIssues);
        } catch (err) {
            console.error("Fetch issues error", err);
            showFeedback("error", "Failed to load issues");
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    useEffect(() => {
        if (!bulkJobId) return undefined;

        const intervalId = window.setInterval(async () => {
            try {
                const res = await axiosInstance.get(`/issues/bulk-upload/${bulkJobId}`);
                const state = res.data?.state;
                if (state === "completed") {
                    const summary = res.data?.summary || {};
                    const createdCount = summary.createdCount || 0;
                    const failedCount = summary.failedCount || 0;
                    const firstError = summary.errors?.[0]?.message;
                    showFeedback(
                        createdCount > 0 ? "success" : "warning",
                        createdCount > 0
                            ? `Bulk upload completed. Created: ${createdCount}, Failed: ${failedCount}`
                            : `Bulk upload completed with no inserts. Created: 0, Failed: ${failedCount}${firstError ? `. First error: ${firstError}` : ""}`,
                    );
                    setBulkStatusText("Upload completed");
                    setBulkJobId("");
                    setBulkUploading(false);
                    fetchIssues();
                }
                if (state === "failed") {
                    showFeedback("error", res.data?.failedReason || "Bulk upload failed");
                    setBulkStatusText("Upload failed");
                    setBulkJobId("");
                    setBulkUploading(false);
                }
            } catch {
                // Keep polling until backend becomes available.
            }
        }, 2000);

        return () => window.clearInterval(intervalId);
    }, [bulkJobId, fetchIssues]);

    const handleFieldChange = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showFeedback("warning", "Title is required");
            return;
        }
        if (!formData.description.trim()) {
            showFeedback("warning", "Description is required");
            return;
        }

        setSaving(true);
        try {
            const payload = new FormData();
            payload.append("title", formData.title.trim());
            payload.append("description", formData.description.trim());
            payload.append("priority", formData.priority);
            payload.append("module", formData.module);
            if (attachmentFile) {
                payload.append("attachment", attachmentFile);
            }

            const res = await axiosInstance.post("/issues", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const created = {
                ...res.data,
                status: normalizeIssueStatus(res.data?.status || "Open"),
            };
            setIssues((prev) => [created, ...prev]);
            showFeedback("success", "Issue reported successfully");
            closeModal();
        } catch (err) {
            const apiMessage = err.response?.data?.message || "Failed to create issue";
            if (apiMessage === "task, title, and description are required") {
                showFeedback("error", "Backend is running old Issue API. Restart backend server and try again.");
                return;
            }
            showFeedback("error", apiMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleResolve = async (issueId) => {
        setResolvingId(issueId);
        try {
            const res = await axiosInstance.patch(`/issues/${issueId}/resolve`);
            const updated = {
                ...res.data,
                status: normalizeIssueStatus(res.data?.status || "Closed"),
            };
            setIssues((prev) => prev.map((iss) => (iss._id === updated._id ? updated : iss)));
            showFeedback("success", "Issue moved to Closed");
        } catch (err) {
            showFeedback("error", err.response?.data?.message || "Failed to close issue");
        } finally {
            setResolvingId(null);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const res = await axiosInstance.get("/issues/bulk-template", {
                responseType: "blob",
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = blobUrl;
            link.setAttribute("download", "issue-bulk-template.csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch {
            const fallback = [
                "title,description,priority,status,module",
                "Login Bug,Login fails,High,Open,Auth",
                "Payment crash,Stripe API error,Critical,Open,Payment",
            ].join("\n");
            const blob = new Blob([fallback], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "issue-bulk-template.csv");
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }
    };

    const handleStartBulkUpload = async () => {
        if (!bulkFile) {
            showFeedback("warning", "Please choose a CSV file first");
            return;
        }

        const form = new FormData();
        form.append("file", bulkFile);

        setBulkUploading(true);
        setBulkStatusText("Uploading...");
        try {
            const res = await axiosInstance.post("/issues/bulk-upload", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data?.queued && res.data?.jobId) {
                setBulkJobId(res.data.jobId);
                setBulkStatusText(`Queued as job ${res.data.jobId}`);
                showFeedback("success", "Bulk upload queued successfully");
                return;
            }

            const summary = res.data?.summary || {};
            const createdCount = summary.createdCount || 0;
            const failedCount = summary.failedCount || 0;
            const firstError = summary.errors?.[0]?.message;
            showFeedback(
                createdCount > 0 ? "success" : "warning",
                createdCount > 0
                    ? `Bulk upload completed. Created: ${createdCount}, Failed: ${failedCount}`
                    : `Bulk upload completed with no inserts. Created: 0, Failed: ${failedCount}${firstError ? `. First error: ${firstError}` : ""}`,
            );
            setBulkStatusText("Upload completed");
            setBulkUploading(false);
            setBulkFile(null);
            fetchIssues();
        } catch (err) {
            setBulkUploading(false);
            setBulkStatusText("");
            showFeedback("error", err.response?.data?.message || "Bulk upload failed");
        }
    };

    const handleDelete = async (issueId) => {
        if (!window.confirm("Delete this issue? This action cannot be undone.")) return;
        setDeletingId(issueId);
        try {
            try {
                await axiosInstance.delete(`/issues/${issueId}`);
            } catch (err) {
                const status = err?.response?.status;
                if (status !== 404 && status !== 405) throw err;
                await axiosInstance.post(`/issues/${issueId}/delete`);
            }
            setIssues((prev) => prev.filter((iss) => iss._id !== issueId));
            showFeedback("success", "Issue deleted");
        } catch (err) {
            showFeedback("error", err.response?.data?.message || "Failed to delete issue");
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = issues.filter((iss) => {
        const term = searchQuery.toLowerCase();
        const matchSearch =
            (iss.title || "").toLowerCase().includes(term) ||
            (iss.description || "").toLowerCase().includes(term) ||
            (iss.module || "").toLowerCase().includes(term) ||
            (iss.reportedBy?.name || iss.reportedBy?.email || "").toLowerCase().includes(term);
        const matchStatus = filterStatus === "All" || iss.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: issues.length,
        open: issues.filter((i) => i.status === "Open").length,
        closed: issues.filter((i) => i.status === "Closed").length,
    };

    return (
        <div className="page-container">
            <FeedbackMessage
                type={feedback.type}
                message={feedback.message}
                onClose={() => setFeedback({ type: "", message: "" })}
            />

            <PageHeader
                title="Manage Issues"
                btnLabel={canCreate ? "+ Create Issue" : undefined}
                onBtnClick={canCreate ? () => setShowModal(true) : undefined}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
                            placeholder="Search by title, reporter, module..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {canBulkUpload && (
                        <Button variant="secondary" onClick={() => setShowBulkModal(true)}>
                            + Bulk Upload Issues
                        </Button>
                    )}
                </div>
            </PageHeader>

            <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
                {[
                    { label: "All", count: stats.total, key: "All" },
                    { label: "Open", count: stats.open, key: "Open" },
                    { label: "Closed", count: stats.closed, key: "Closed" },
                ].map(({ label, count, key }) => (
                    <button
                        key={key}
                        onClick={() => setFilterStatus(key)}
                        className={filterStatus === key ? "btn btn-primary" : "btn btn-secondary"}
                        style={{ borderRadius: 20, padding: "6px 18px", fontSize: 13 }}
                    >
                        {label} <span style={{ opacity: 0.7 }}>({count})</span>
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingSpinner message="Loading issues..." />
            ) : filtered.length === 0 ? (
                <div
                    style={{
                        textAlign: "center",
                        padding: "64px 20px",
                        color: "var(--text-muted)",
                        fontSize: 15,
                    }}
                >
                    {searchQuery || filterStatus !== "All"
                        ? "No issues match your current filters."
                        : 'No issues reported yet. Click "+ Create Issue" to get started.'}
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table className="role-table" style={{ marginTop: 0 }}>
                        <thead>
                            <tr>
                                <th style={{ minWidth: 170 }}>Title</th>
                                <th style={{ minWidth: 210 }}>Description</th>
                                <th style={{ minWidth: 90 }}>Priority</th>
                                <th style={{ minWidth: 100 }}>Status</th>
                                <th style={{ minWidth: 90 }}>Module</th>
                                <th style={{ minWidth: 130 }}>Reported By</th>
                                <th style={{ minWidth: 210 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((iss) => (
                                <tr key={iss._id}>
                                    <td style={{ fontWeight: 600 }}>{iss.title}</td>
                                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                        {iss.description?.length > 90
                                            ? `${iss.description.slice(0, 90)}...`
                                            : iss.description}
                                    </td>
                                    <td>{iss.priority || "Medium"}</td>
                                    <td>
                                        <span className={`status-badge ${statusClass(iss.status)}`}>
                                            {iss.status}
                                        </span>
                                    </td>
                                    <td>{iss.module || "Auth"}</td>
                                    <td style={{ fontSize: 13 }}>
                                        <div style={{ fontWeight: 600 }}>{iss.reportedBy?.name || "-"}</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                            {iss.reportedBy?.email || ""}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            {iss.attachmentUrl ? (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => setPreviewUrl(iss.attachmentUrl)}
                                                >
                                                    View Screenshot
                                                </Button>
                                            ) : (
                                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No file</span>
                                            )}

                                            {canResolve &&
                                                (iss.status !== "Closed" ? (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => handleResolve(iss._id)}
                                                        disabled={resolvingId === iss._id || deletingId === iss._id}
                                                    >
                                                        {resolvingId === iss._id ? "Closing..." : "Close"}
                                                    </Button>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Done</span>
                                                ))}
                                            {canDelete && (
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(iss._id)}
                                                    disabled={deletingId === iss._id || resolvingId === iss._id}
                                                >
                                                    {deletingId === iss._id ? "Deleting..." : "Delete"}
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {previewUrl && (
                <div className="modal-overlay" onClick={closePreviewModal}>
                    <div className="modal-box" style={{ maxWidth: 900, width: "92vw" }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Attachment Preview</h3>
                            <button className="modal-close" onClick={closePreviewModal} aria-label="Close">
                                x
                            </button>
                        </div>
                        <div className="modal-body" style={{ paddingTop: 0 }}>
                            <iframe
                                title="Issue Attachment"
                                src={previewUrl}
                                style={{ width: "100%", height: "70vh", border: "1px solid var(--ui-border)", borderRadius: 8 }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Issue</h3>
                            <button className="modal-close" onClick={closeModal} aria-label="Close">
                                x
                            </button>
                        </div>

                        <div className="modal-body">
                            <form id="create-issue-form" onSubmit={handleCreate}>
                                <div className="form-group">
                                    <label htmlFor="iss-title">Title</label>
                                    <input
                                        id="iss-title"
                                        type="text"
                                        placeholder="Login page crash"
                                        value={formData.title}
                                        onChange={(e) => handleFieldChange("title", e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-desc">Description</label>
                                    <textarea
                                        id="iss-desc"
                                        placeholder="Login API returning 500"
                                        value={formData.description}
                                        onChange={(e) => handleFieldChange("description", e.target.value)}
                                        rows={4}
                                        style={{ resize: "vertical", minHeight: 90 }}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-priority">Priority</label>
                                    <select
                                        id="iss-priority"
                                        value={formData.priority}
                                        onChange={(e) => handleFieldChange("priority", e.target.value)}
                                    >
                                        {PRIORITIES.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-status">Status</label>
                                    <input id="iss-status" type="text" value="Open" readOnly />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-module">Module</label>
                                    <select
                                        id="iss-module"
                                        value={formData.module}
                                        onChange={(e) => handleFieldChange("module", e.target.value)}
                                    >
                                        {MODULES.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-reporter">Reporter</label>
                                    <input
                                        id="iss-reporter"
                                        type="text"
                                        value={user?.name ? `${user.name} (${user.email || ""})` : user?.email || "Current user"}
                                        readOnly
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-attachment">Attachment</label>
                                    <input
                                        id="iss-attachment"
                                        type="file"
                                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <Button type="button" variant="secondary" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button type="submit" form="create-issue-form" variant="primary" disabled={saving}>
                                {saving ? "Reporting..." : "Report Issue"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkModal && (
                <div className="modal-overlay" onClick={closeBulkModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Bulk Upload Issues</h3>
                            <button className="modal-close" onClick={closeBulkModal} aria-label="Close">
                                x
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Step 1: Download Template</label>
                                <Button variant="secondary" onClick={handleDownloadTemplate}>
                                    Download CSV Template
                                </Button>
                            </div>

                            <div className="form-group" style={{ marginTop: 14 }}>
                                <label htmlFor="bulk-csv">Step 2: Upload File</label>
                                <input
                                    id="bulk-csv"
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                                />
                                {bulkFile && (
                                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-muted)" }}>
                                        Selected: {bulkFile.name}
                                    </div>
                                )}
                            </div>

                            <div className="form-group" style={{ marginTop: 14 }}>
                                <label>Step 3: Upload</label>
                                <Button variant="primary" onClick={handleStartBulkUpload} disabled={bulkUploading}>
                                    {bulkUploading ? "Uploading..." : "Start Upload"}
                                </Button>
                                {bulkStatusText && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                                        {bulkStatusText}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <Button type="button" variant="secondary" onClick={closeBulkModal}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageIssues;
