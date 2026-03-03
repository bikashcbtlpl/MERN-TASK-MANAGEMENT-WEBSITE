/**
 * TaskStatusSelect — a <select> with all 7 standard task statuses.
 *
 * Props:
 *   value     {string}
 *   onChange  {fn(e)}
 *   style     {object}  – optional inline styles
 */
const TASK_STATUSES = [
    "Open",
    "In Progress",
    "Pending",
    "On Hold",
    "Closed",
    "Completed",
    "Cancelled",
];

const TaskStatusSelect = ({ value, onChange, style }) => (
    <select value={value} onChange={onChange} style={style}>
        {TASK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
        ))}
    </select>
);

export { TASK_STATUSES };
export default TaskStatusSelect;
