/**
 * Modal — generic overlay modal with a title and close-on-overlay-click.
 *
 * Props:
 *   isOpen    {bool}
 *   onClose   {fn}
 *   title     {string}
 *   children  {node}   – form or any content
 */
const Modal = ({ isOpen, onClose, title, children, modalStyle }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                {children}
            </div>
        </div>
    );
};

export default Modal;
