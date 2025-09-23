import { useState, useEffect } from 'react';

const Pagination = ({ 
  currentPage, 
  totalCount, 
  pageSize = 50, 
  onPageChange,
  maxPageNumbers = 7 
}) => {
  const [safePage, setSafePage] = useState(1);
  const [goToPage, setGoToPage] = useState('');
  
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  useEffect(() => {
    const validPage = Math.max(1, Math.min(currentPage || 1, totalPages));
    setSafePage(validPage);
    
    if (currentPage !== validPage && onPageChange) {
      onPageChange(validPage);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePageChange = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setSafePage(validPage);
    if (onPageChange) {
      onPageChange(validPage);
    }
  };

  const handleGoToPageSubmit = (e) => {
    e.preventDefault();
    const pageNumber = parseInt(goToPage.trim(), 10);
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      handlePageChange(pageNumber);
      setGoToPage('');
    }
  };

  const handleGoToPageKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleGoToPageSubmit(e);
    }
  };

  const generatePageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfRange = Math.floor(maxPageNumbers / 2);
    let startPage = Math.max(1, safePage - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

    if (endPage - startPage + 1 < maxPageNumbers) {
      startPage = Math.max(1, endPage - maxPageNumbers + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalCount <= 0 || totalPages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers();
  const isFirstPage = safePage === 1;
  const isLastPage = safePage === totalPages;

  return (
    <div className="pagination-container">
      <button
        className={`pagination-btn ${isFirstPage ? 'disabled' : ''}`}
        onClick={() => handlePageChange(safePage - 1)}
        disabled={isFirstPage}
        aria-label="Previous page"
      >
        &#8249;
      </button>

      <div className="page-numbers">
        {pageNumbers.map((page, index) => (
          <span key={`${page}-${index}`}>
            {page === '...' ? (
              <span className="pagination-ellipsis">...</span>
            ) : (
              <button
                className={`pagination-btn ${page === safePage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={page === safePage ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </span>
        ))}
      </div>

      <button
        className={`pagination-btn ${isLastPage ? 'disabled' : ''}`}
        onClick={() => handlePageChange(safePage + 1)}
        disabled={isLastPage}
        aria-label="Next page"
      >
        &#8250;
      </button>

      <div className="go-to-page">
        <span className="go-to-label">Gehe zu:</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={goToPage}
          onChange={(e) => setGoToPage(e.target.value)}
          onKeyDown={handleGoToPageKeyDown}
          placeholder={`1-${totalPages}`}
          className="go-to-input"
          title={`Seitenzahl eingeben (1-${totalPages}) und Enter drücken`}
        />
      </div>

      <style jsx>{`
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 24px 0;
          user-select: none;
        }

        .page-numbers {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pagination-btn {
          padding: 10px 14px;
          border: 2px solid #e1e4e8;
          background: #ffffff;
          cursor: pointer;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          min-width: 44px;
          height: 40px;
          color: #586069;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
        }

        .pagination-btn:hover:not(.disabled) {
          background: #f6f8fa;
          border-color: #a5b4fc;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }

        .pagination-btn:focus {
          outline: none;
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.2);
        }

        .pagination-btn.active {
          background: #dbeafe;
          color: #1e40af;
          border-color: #bfdbfe;
          box-shadow: 0 2px 8px rgba(30, 64, 175, 0.1);
        }

        .pagination-btn.active:hover {
          background: #bfdbfe;
          border-color: #93c5fd;
        }

        .pagination-btn.disabled {
          background: #f6f8fa;
          color: #8b949e;
          cursor: not-allowed;
          border-color: #e1e4e8;
          transform: none;
          box-shadow: none;
        }

        .pagination-ellipsis {
          padding: 10px 6px;
          color: #8b949e;
          font-size: 14px;
          font-weight: 500;
        }

        .go-to-page {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 16px;
          padding: 0 12px;
          border-left: 1px solid #e1e4e8;
          padding-left: 16px;
        }

        .go-to-label {
          font-size: 14px;
          color: #586069;
          font-weight: 500;
          white-space: nowrap;
        }

        .go-to-input {
          width: 70px;
          padding: 6px 8px;
          border: 2px solid #e1e4e8;
          border-radius: 6px;
          font-size: 14px;
          text-align: center;
          background: #ffffff;
          color: #586069;
          transition: all 0.3s ease;
        }

        .go-to-input:focus {
          outline: none;
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.1);
        }

        .go-to-input::placeholder {
          color: #8b949e;
          font-size: 12px;
        }

        @media (max-width: 640px) {
          .pagination-container {
            gap: 4px;
            margin: 20px 0;
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .pagination-btn {
            padding: 8px 10px;
            min-width: 36px;
            height: 36px;
            font-size: 13px;
          }
          
          .pagination-ellipsis {
            padding: 8px 4px;
            font-size: 13px;
          }

          .go-to-page {
            margin-left: 0;
            margin-top: 8px;
            border-left: none;
            border-top: 1px solid #e1e4e8;
            padding-left: 0;
            padding-top: 8px;
            width: 100%;
            justify-content: center;
          }

          .go-to-label {
            font-size: 13px;
          }

          .go-to-input {
            width: 60px;
            padding: 5px 6px;
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .pagination-btn {
            padding: 6px 8px;
            min-width: 32px;
            height: 32px;
            font-size: 12px;
          }
          
          .pagination-ellipsis {
            padding: 6px 2px;
            font-size: 12px;
          }

          .go-to-label {
            font-size: 12px;
          }

          .go-to-input {
            width: 55px;
            padding: 4px 5px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Pagination;