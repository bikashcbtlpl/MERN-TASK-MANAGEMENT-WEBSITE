/**
 * Button — unified button component for the entire app.
 *
 * Props:
 *   variant    {string}  – "primary" | "secondary" | "danger" | "warning" | "ghost"
 *                          Defaults to "primary"
 *   size       {string}  – "sm" | "md" | "lg"  Defaults to "md"
 *   type       {string}  – button type, defaults to "button"
 *   fullWidth  {bool}    – stretch to 100% width
 *   disabled   {bool}
 *   loading    {bool}    – shows spinner inside button
 *   onClick    {fn}
 *   children   {node}
 *   className  {string}  – extra classes
 *   style      {object}  – extra inline styles
 */
const Button = ({
  variant = "primary",
  size = "md",
  type = "button",
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  children,
  className = "",
  style = {},
}) => {
  const classes = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? "btn-full" : "",
    loading ? "btn-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
    >
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  );
};

export default Button;
