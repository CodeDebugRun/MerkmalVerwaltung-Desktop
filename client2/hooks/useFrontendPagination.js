import { useState, useMemo } from 'react';

/**
 * Frontend pagination hook for client-side data pagination
 * Extracts pagination logic from index.js for better code organization
 *
 * @param {Array} data - Array of data to paginate
 * @param {number} itemsPerPage - Items per page (default: 50)
 * @returns {object} Pagination state and handlers
 */
export const useFrontendPagination = (data = [], itemsPerPage = 50) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');

  // Calculate pagination values
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get current page data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Page change handler with bounds checking
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Navigation handlers
  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  // Generate pagination numbers with ellipsis (exact copy from index.js)
  const getPaginationNumbers = () => {
    const numbers = [];
    const delta = 2; // How many pages to show around current page

    if (totalPages <= 7) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        numbers.push(i);
      }
    } else {
      // Always show first page
      numbers.push(1);

      if (currentPage > delta + 2) {
        numbers.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);

      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }

      if (currentPage < totalPages - delta - 1) {
        numbers.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        numbers.push(totalPages);
      }
    }

    return numbers;
  };

  // Page input handlers
  const handlePageInputChange = (value) => {
    setPageInput(value);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
      setPageInput('');
    } else {
      alert(`Bitte geben Sie eine Seitenzahl zwischen 1 und ${totalPages} ein.`);
    }
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit(e);
    }
  };

  // Reset to first page (useful when data or filters change)
  const resetToFirstPage = () => {
    setCurrentPage(1);
  };

  // Display information
  const displayInfo = {
    startItem: totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0,
    endItem: Math.min(currentPage * itemsPerPage, totalItems),
    totalItems,
    currentPageItems: paginatedData.length
  };

  return {
    // Current page data
    paginatedData,

    // State
    currentPage,
    pageInput,
    totalPages,
    itemsPerPage,
    totalItems,

    // Handlers
    handlePageChange,
    handlePreviousPage,
    handleNextPage,
    handlePageInputChange,
    handlePageInputSubmit,
    handlePageInputKeyPress,
    getPaginationNumbers,
    resetToFirstPage,

    // Computed properties
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
    isEmpty: totalItems === 0,
    hasData: totalItems > 0,

    // Display info
    displayInfo
  };
};