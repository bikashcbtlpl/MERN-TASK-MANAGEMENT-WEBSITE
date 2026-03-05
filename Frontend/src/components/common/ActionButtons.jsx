import Button from "./Button";

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
    <td onClick={(e) => e.stopPropagation()} className="action-cell">
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {canEdit && onEdit && (
          <Button variant="warning" size="sm" onClick={onEdit}>
            {editLabel}
          </Button>
        )}
        {canDelete && onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete}>
            {deleteLabel}
          </Button>
        )}
      </div>
    </td>
  );
};

export default ActionButtons;
