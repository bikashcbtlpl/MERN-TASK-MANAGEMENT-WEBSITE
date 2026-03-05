/**
 * FormField — label + input/select wrapped in the standard form-group div.
 *
 * Props:
 *   label     {string}
 *   style     {object}  – optional extra inline styles on the wrapper div
 *   children  {node}    – the input, select, textarea, etc.
 */
const FormField = ({ label, style, children }) => (
  <div className="form-group" style={style}>
    <label>{label}</label>
    {children}
  </div>
);

export default FormField;
