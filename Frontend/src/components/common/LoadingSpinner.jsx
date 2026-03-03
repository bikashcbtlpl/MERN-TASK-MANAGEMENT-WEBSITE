/**
 * LoadingSpinner — simple loading state placeholder.
 *
 * Props:
 *   message  {string}  – default "Loading..."
 *   style    {object}  – optional extra inline styles on the wrapper
 */
const LoadingSpinner = ({ message = "Loading...", style }) => (
    <div style={{ padding: "20px", ...style }}>{message}</div>
);

export default LoadingSpinner;
