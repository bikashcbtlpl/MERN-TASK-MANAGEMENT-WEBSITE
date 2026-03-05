import Button from "./Button";

/**
 * PageHeader — reusable page title bar with an optional primary action button.
 *
 * Props:
 *   title      {string}   – heading text
 *   btnLabel   {string}   – button label (omit to hide button)
 *   onBtnClick {fn}       – button click handler
 *   children   {node}     – extra content placed to the right of the button (e.g. search)
 */
const PageHeader = ({ title, btnLabel, onBtnClick, children }) => (
  <div className="page-header">
    <h2 className="page-header-title">{title}</h2>
    <div className="page-header-actions">
      {children}
      {btnLabel && onBtnClick && (
        <Button variant="primary" size="md" onClick={onBtnClick}>
          {btnLabel}
        </Button>
      )}
    </div>
  </div>
);

export default PageHeader;
