import { useEffect, useState, useCallback } from "react";
import axiosInstance from "../../api/axiosInstance";
import usePermissions from "../../hooks/usePermissions";
import { PERMS } from "../../permissions/can";
import {
    Button,
    PageHeader,
    LoadingSpinner,
    FeedbackMessage,
} from "../../components/common";

/* ─── status badge colour helper ─── */
const statusClass = (s) =>
    s === "Resolved" ? "active" : s === "Open" ? "inactive" : "pending";

function ManageIssues() {
    const { can } = usePermissions();
    // Anyone who can interact with tasks can report issues
    const canCreate = can(PERMS.ISSUE_CREATE)
        || can(PERMS.TASK_VIEW)
        || can(PERMS.TASK_CREATE)
        || can(PERMS.TASK_EDIT);
    // Only privileged users can resolve
    const canResolve = can(PERMS.ISSUE_EDIT);

    /* ── data ── */
    const [issues, setIssues] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    /* ── filters ── */
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");

    /* ── create-issue modal ── */
    const [showModal, setShowModal] = useState(false);
    const [formTask, setFormTask] = useState("");
    const [formTitle, setFormTitle] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [saving, setSaving] = useState(false);

    /* ── resolve state ── */
    const [resolvingId, setResolvingId] = useState(null);

    const showFeedback = (type, message) => setFeedback({ type, message });

    const closeModal = () => {
        setShowModal(false);
        setFormTask("");
        setFormTitle("");
        setFormDesc("");
    };

    /* ════════════════════════════════════
       FETCH
    ════════════════════════════════════ */
    const fetchIssues = useCallback(async () => {
        try {
            setLoading(true);
            const params = {};
            if (filterStatus !== "All") params.status = filterStatus;
            const res = await axiosInstance.get("/issues", { params });
            setIssues(res.data?.issues || res.data || []);
        } catch (err) {
            console.error("Fetch issues error", err);
            showFeedback("error", "Failed to load issues");
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await axiosInstance.get("/tasks");
            const list = Array.isArray(res.data) ? res.data : res.data?.tasks || [];
            setTasks(list);
        } catch {
            setTasks([]);
        }
    }, []);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);
    useEffect(() => { if (showModal) fetchTasks(); }, [showModal, fetchTasks]);

    /* ════════════════════════════════════
       CREATE
    ════════════════════════════════════ */
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formTask) { showFeedback("warning", "Please select a task"); return; }
        if (!formTitle) { showFeedback("warning", "Title is required"); return; }
        if (!formDesc) { showFeedback("warning", "Description is required"); return; }

        setSaving(true);
        try {
            const res = await axiosInstance.post("/issues", {
                task: formTask,
                title: formTitle.trim(),
                description: formDesc.trim(),
            });
            setIssues((prev) => [res.data, ...prev]);
            showFeedback("success", "Issue reported successfully");
            closeModal();
        } catch (err) {
            showFeedback("error", err.response?.data?.message || "Failed to create issue");
        } finally {
            setSaving(false);
        }
    };

    /* ════════════════════════════════════
       RESOLVE
    ════════════════════════════════════ */
    const handleResolve = async (issueId) => {
        setResolvingId(issueId);
        try {
            const res = await axiosInstance.patch(`/issues/${issueId}/resolve`);
            setIssues((prev) =>
                prev.map((iss) => (iss._id === res.data._id ? res.data : iss)),
            );
            showFeedback("success", "Issue marked as resolved");
        } catch (err) {
            showFeedback("error", err.response?.data?.message || "Failed to resolve issue");
        } finally {
            setResolvingId(null);
        }
    };

    /* ── filtered list ── */
    const filtered = issues.filter((iss) => {
        const term = searchQuery.toLowerCase();
        const matchSearch =
            (iss.title || "").toLowerCase().includes(term) ||
            (iss.description || "").toLowerCase().includes(term) ||
            (iss.task?.title || "").toLowerCase().includes(term) ||
            (iss.reportedBy?.name || iss.reportedBy?.email || "").toLowerCase().includes(term);
        const matchStatus = filterStatus === "All" || iss.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const stats = {
        total: issues.length,
        open: issues.filter((i) => i.status === "Open").length,
        resolved: issues.filter((i) => i.status === "Resolved").length,
    };

    /* ════════════════════════════════════
       RENDER
    ════════════════════════════════════ */
    return (
        <div className="page-container">
            <FeedbackMessage
                type={feedback.type}
                message={feedback.message}
                onClose={() => setFeedback({ type: "", message: "" })}
            />

            <PageHeader
                title="Manage Issues"
                btnLabel={canCreate ? "+ Report Issue" : undefined}
                onBtnClick={canCreate ? () => setShowModal(true) : undefined}
            >
                <div className="header-search-wrapper">
                    <span className="search-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </span>
                    <input
                        className="header-search"
                        type="text"
                        placeholder="Search by title, task, or reporter…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </PageHeader>

            {/* ── Status filter chips ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
                {[
                    { label: "All", count: stats.total, key: "All" },
                    { label: "Open", count: stats.open, key: "Open" },
                    { label: "Resolved", count: stats.resolved, key: "Resolved" },
                ].map(({ label, count, key }) => (
                    <button
                        key={key}
                        onClick={() => setFilterStatus(key)}
                        className={filterStatus === key ? "btn btn-primary" : "btn btn-secondary"}
                        style={{ borderRadius: 20, padding: "6px 18px", fontSize: 13 }}
                    >
                        {label}&nbsp;<span style={{ opacity: 0.7 }}>({count})</span>
                    </button>
                ))}
            </div>

            {/* ── Table ── */}
            {loading ? (
                <LoadingSpinner message="Loading issues…" />
            ) : filtered.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "64px 20px",
                    color: "var(--text-muted)", fontSize: 15,
                }}>
                    {searchQuery || filterStatus !== "All"
                        ? "No issues match your current filters."
                        : 'No issues reported yet. Click "+ Report Issue" to get started.'}
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table className="role-table" style={{ marginTop: 0 }}>
                        <thead>
                            <tr>
                                <th style={{ minWidth: 180 }}>Title</th>
                                <th style={{ minWidth: 220 }}>Description</th>
                                <th style={{ minWidth: 150 }}>Task</th>
                                <th style={{ minWidth: 130 }}>Reported By</th>
                                <th style={{ minWidth: 100 }}>Status</th>
                                <th style={{ minWidth: 120 }}>Date</th>
                                {canResolve && <th style={{ minWidth: 100 }}>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((iss) => (
                                <tr key={iss._id}>
                                    <td style={{ fontWeight: 600 }}>{iss.title}</td>
                                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                        {iss.description?.length > 90
                                            ? iss.description.slice(0, 90) + "…"
                                            : iss.description}
                                    </td>
                                    <td>
                                        <span style={{
                                            background: "var(--ui-surface-soft)",
                                            border: "1px solid var(--ui-border)",
                                            borderRadius: 6, padding: "2px 8px", fontSize: 12,
                                        }}>
                                            {iss.task?.title || "—"}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 13 }}>
                                        <div style={{ fontWeight: 600 }}>{iss.reportedBy?.name || "—"}</div>
                                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>
                                            {iss.reportedBy?.email}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${statusClass(iss.status)}`}>
                                            {iss.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                        {new Date(iss.createdAt).toLocaleDateString()}<br />
                                        <span style={{ fontSize: 11 }}>
                                            {new Date(iss.createdAt).toLocaleTimeString([], {
                                                hour: "2-digit", minute: "2-digit",
                                            })}
                                        </span>
                                    </td>
                                    {canResolve && (
                                        <td>
                                            {iss.status !== "Resolved" ? (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handleResolve(iss._id)}
                                                    disabled={resolvingId === iss._id}
                                                >
                                                    {resolvingId === iss._id ? "Resolving…" : "Resolve"}
                                                </Button>
                                            ) : (
                                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>✓ Done</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ════════════════════════════════════
          REPORT ISSUE MODAL
      ════════════════════════════════════ */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="modal-header">
                            <h3>⚠️ Report an Issue</h3>
                            <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
                        </div>

                        {/* Body — form uses existing task-page form-group CSS */}
                        <div className="modal-body">
                            <form id="create-issue-form" onSubmit={handleCreate}>

                                <div className="form-group">
                                    <label htmlFor="iss-task">Task *</label>
                                    <select
                                        id="iss-task"
                                        value={formTask}
                                        onChange={(e) => setFormTask(e.target.value)}
                                        required
                                    >
                                        <option value="">— Select a task —</option>
                                        {tasks.map((t) => (
                                            <option key={t._id} value={t._id}>{t.title}</option>
                                        ))}
                                    </select>
                                    {tasks.length === 0 && (
                                        <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                                            Loading tasks…
                                        </span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-title">Issue Title *</label>
                                    <input
                                        id="iss-title"
                                        type="text"
                                        placeholder="Short summary of the issue"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="iss-desc">Description *</label>
                                    <textarea
                                        id="iss-desc"
                                        placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behaviour…"
                                        value={formDesc}
                                        onChange={(e) => setFormDesc(e.target.value)}
                                        rows={5}
                                        style={{ resize: "vertical", minHeight: 110 }}
                                        required
                                    />
                                </div>

                            </form>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <Button type="button" variant="secondary" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                form="create-issue-form"
                                variant="primary"
                                disabled={saving}
                            >
                                {saving ? "Reporting…" : "Report Issue"}
                            </Button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default ManageIssues;
