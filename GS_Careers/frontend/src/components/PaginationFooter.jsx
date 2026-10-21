import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const PaginationFooter = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 10,
    onPageChange = () => {},
    label = 'items'
}) => {
    // Handle 0 items gracefully
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    if (totalItems === 0) return null;

    return (
        <div className="pagination-footer">
            <div className="page-info">
                Showing <strong>{startItem === 0 ? 0 : `${startItem}–${endItem}`}</strong> of <strong>{totalItems}</strong> {label}
            </div>

            <div className="pagination-controls">
                <button
                    type="button"
                    className="page-btn prev-btn"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || totalPages <= 1}
                    title="Previous Page"
                >
                    <FiChevronLeft size={15} />
                    <span className="btn-label">Previous</span>
                </button>

                <div className="page-numbers-group">
                    <button
                        type="button"
                        className="page-num-btn active"
                        title={`Page ${currentPage} of ${totalPages}`}
                    >
                        {currentPage}
                    </button>
                </div>

                <button
                    type="button"
                    className="page-btn next-btn"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages || totalPages <= 1}
                    title="Next Page"
                >
                    <span className="btn-label">Next</span>
                    <FiChevronRight size={15} />
                </button>
            </div>
        </div>
    );
};

export default PaginationFooter;
