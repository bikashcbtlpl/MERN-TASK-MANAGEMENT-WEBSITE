/**
 * StatusBadge — coloured pill showing Active / Inactive or any status string.
 *
 * Props:
 *   status  {string}   – e.g. "Active", "Inactive", "Open", "Completed", …
 *   type    {string}   – "role" (default) renders role-status class;
 *                        "task" renders status-badge class
 */
const StatusBadge = ({ status, type = "role" }) => {
    if (type === "task") {
        const slug = status?.toLowerCase().replace(/\s+/g, "-");
        return <span className={`status-badge status-${slug}`}>{status}</span>;
    }

    // default: role-style (Active / Inactive)
    return (
        <span
            className={
                status === "Active" ? "role-status active" : "role-status inactive"
            }
        >
            {status}
        </span>
    );
};

export default StatusBadge;
