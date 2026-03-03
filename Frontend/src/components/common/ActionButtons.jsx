/**
 * ActionButtons — Edit and/or Delete button pair used in every Manage table.
 *
 * Props:
 *   canEdit    {bool}
 *   canDelete  {bool}
 *   onEdit     {fn}
 *   onDelete   {fn}
 *   editLabel  {string}  – default "Edit"
 *   deleteLabel{string}  – default "Delete"
 */
const ActionButtons = ({
    canEdit,
    canDelete,
    onEdit,
    onDelete,
    editLabel = "Edit",
    deleteLabel = "Delete",
}) => {
    if (!canEdit && !canDelete) return null;

    return (
        <td onClick={(e) => e.stopPropagation()}>
            {canEdit && onEdit && (
                <button className="edit-role-btn" onClick={onEdit}>
                    {editLabel}
                </button>
            )}
            {canDelete && onDelete && (
                <button className="delete-role-btn" onClick={onDelete}>
                    {deleteLabel}
                </button>
            )}
        </td>
    );
};

export default ActionButtons;
