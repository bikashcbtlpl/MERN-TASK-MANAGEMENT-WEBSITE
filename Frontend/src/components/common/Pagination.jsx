/**
 * Pagination — Prev / Page X of Y / Next controls.
 *
 * Props:
 *   currentPage  {number}
 *   totalPages   {number}
 *   onPageChange {fn(newPage)}  – called with the new page number
 *   totalCount   {number}       – optional total item count shown in the label
 *   countLabel   {string}       – optional label prefix e.g. "Tasks" → "Total: 42 Tasks"
 */
const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    totalCount,
    countLabel,
}) => {
    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
                Prev
            </button>

            <span className="page-info">
                Page {currentPage} of {totalPages}
                {totalCount !== undefined && (
                    <> — Total: {totalCount}{countLabel ? ` ${countLabel}` : ""}</>
                )}
            </span>

            <button
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                Next
            </button>
        </div>
    );
};

export default Pagination;
