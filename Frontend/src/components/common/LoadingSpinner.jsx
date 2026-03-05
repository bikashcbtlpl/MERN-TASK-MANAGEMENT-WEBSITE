/**
 * LoadingSpinner — animated spinner with an optional message.
 *
 * Props:
 *   message  {string}  – default "Loading..."
 *   style    {object}  – optional extra inline styles on the wrapper
 *   size     {string}  – "sm" | "md" | "lg", defaults to "md"
 *   fullPage {bool}    – center in full viewport
 */
const LoadingSpinner = ({
    message = "Loading...",
    style,
    size = "md",
    fullPage = false,
}) => (
    <div
        className={`spinner-wrapper${fullPage ? " spinner-fullpage" : ""}`}
        style={style}
    >
        <div className={`spinner spinner-${size}`} />
        {message && <p className="spinner-msg">{message}</p>}
    </div>
);

export default LoadingSpinner;
