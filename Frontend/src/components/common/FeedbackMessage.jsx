function FeedbackMessage({ type = "info", message, onClose }) {
  if (!message) return null;

  const styles = {
    info: { bg: "#e0f2fe", color: "#075985", border: "#7dd3fc" },
    success: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    warning: { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
    error: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  };

  const palette = styles[type] || styles.info;

  return (
    <div
      style={{
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "none",
            background: "transparent",
            color: palette.color,
            cursor: "pointer",
            fontWeight: 700,
          }}
          aria-label="Dismiss message"
        >
          x
        </button>
      )}
    </div>
  );
}

export default FeedbackMessage;
