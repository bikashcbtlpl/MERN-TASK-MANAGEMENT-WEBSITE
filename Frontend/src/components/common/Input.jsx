/**
 * Input — unified input/select/textarea component.
 *
 * Props:
 *   as         {string}   – "input" | "select" | "textarea" — defaults to "input"
 *   label      {string}   – optional label text
 *   error      {string}   – error message shown below the field
 *   fullWidth  {bool}     – stretch to 100%, default true
 *   className  {string}   – extra classes on the root element
 *   All other props are forwarded to the underlying element (type, value, onChange, placeholder, etc.)
 */
const Input = ({
  as = "input",
  label,
  error,
  fullWidth = true,
  className = "",
  id,
  children,
  ...rest
}) => {
  const inputId =
    id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const inputClasses = [
    "field-input",
    fullWidth ? "field-full" : "",
    error ? "field-error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`field-wrapper${fullWidth ? " field-wrapper-full" : ""}`}>
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {as === "textarea" ? (
        <textarea id={inputId} className={inputClasses} {...rest}>
          {children}
        </textarea>
      ) : as === "select" ? (
        <select id={inputId} className={inputClasses} {...rest}>
          {children}
        </select>
      ) : (
        <input id={inputId} className={inputClasses} {...rest} />
      )}
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
};

export default Input;
