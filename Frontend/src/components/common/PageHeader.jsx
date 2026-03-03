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
    <div className="manage-role-header">
        <h2>{title}</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {children}
            {btnLabel && onBtnClick && (
                <button className="create-role-btn" onClick={onBtnClick}>
                    {btnLabel}
                </button>
            )}
        </div>
    </div>
);

export default PageHeader;
