import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl();

export const usePagination = (endpoint = '/merkmalstexte', initialPageSize = 50, filters = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: initialPageSize,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentFilters, setCurrentFilters] = useState({});

  const fetchData = useCallback(async (page = 1, pageSize = initialPageSize, customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: Math.max(1, page),
        limit: Math.max(1, Math.min(pageSize, 1000)), // Backend has max 1000 limit
        ...filters,
        ...customFilters
      };
      
      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      // Use filter endpoint if there are any filters applied, otherwise use the regular endpoint
      const hasFilters = Object.keys(customFilters).some(key => 
        customFilters[key] !== undefined && 
        customFilters[key] !== null && 
        customFilters[key] !== ''
      ) || Object.keys(filters).some(key => 
        filters[key] !== undefined && 
        filters[key] !== null && 
        filters[key] !== ''
      );
      
      const apiEndpoint = hasFilters && endpoint === '/merkmalstexte' 
        ? `${API_BASE_URL}/merkmalstexte/filter` 
        : `${API_BASE_URL}${endpoint}`;
      
      const response = await axios.get(apiEndpoint, { params });
      
      if (response.data && response.data.success) {
        const { data: responseData, pagination: paginationData } = response.data.data;
        
        setData(responseData || []);
        setPagination({
          currentPage: paginationData?.currentPage || 1,
          totalPages: paginationData?.totalPages || 1,
          totalCount: paginationData?.totalCount || 0,
          pageSize: paginationData?.pageSize || initialPageSize,
          hasNextPage: paginationData?.hasNextPage || false,
          hasPreviousPage: paginationData?.hasPreviousPage || false
        });
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error fetching paginated data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch data');
      setData([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        pageSize: initialPageSize,
        hasNextPage: false,
        hasPreviousPage: false
      });
    } finally {
      setLoading(false);
    }
  }, [endpoint, initialPageSize]); // Remove filters from dependencies to prevent infinite loop

  const goToPage = useCallback((page) => {
    const safePage = Math.max(1, Math.min(page, pagination.totalPages));
    fetchData(safePage, pagination.pageSize, currentFilters);
  }, [fetchData, pagination.totalPages, pagination.pageSize, currentFilters]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1);
    }
  }, [goToPage]);

  const previousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      goToPage(pagination.currentPage - 1);
    }
  }, [goToPage]);

  const changePageSize = useCallback((newPageSize) => {
    const safePage = Math.max(1, Math.min(newPageSize, 1000));
    fetchData(1, safePage); // Go to first page when changing page size
  }, [fetchData]);

  const refresh = useCallback(async () => {
    // Mevcut sayfa verilerini getir
    await fetchData(pagination.currentPage, pagination.pageSize, currentFilters);
  }, [fetchData, pagination.currentPage, pagination.pageSize, currentFilters]);

  const refreshWithPageAdjustment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: Math.max(1, pagination.currentPage),
        limit: Math.max(1, Math.min(pagination.pageSize, 1000)),
        ...filters,
        ...currentFilters
      };

      // Remove empty filter values
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      // Check if filters are applied
      const hasFilters = Object.keys(currentFilters).some(key =>
        currentFilters[key] !== undefined &&
        currentFilters[key] !== null &&
        currentFilters[key] !== ''
      ) || Object.keys(filters).some(key =>
        filters[key] !== undefined &&
        filters[key] !== null &&
        filters[key] !== ''
      );

      const apiEndpoint = hasFilters && endpoint === '/merkmalstexte'
        ? `${API_BASE_URL}/merkmalstexte/filter`
        : `${API_BASE_URL}${endpoint}`;

      const response = await axios.get(apiEndpoint, { params });

      if (response.data && response.data.success) {
        const { data: responseData, pagination: paginationData } = response.data.data;

        // Eğer mevcut sayfa boş ve birden fazla sayfa varsa, bir önceki sayfaya git
        if ((!responseData || responseData.length === 0) &&
            pagination.currentPage > 1 &&
            paginationData?.totalPages > 0) {

          console.log('Current page is empty, going to previous page...');
          const newPage = Math.min(pagination.currentPage - 1, paginationData.totalPages);
          await fetchData(newPage, pagination.pageSize, currentFilters);
          return;
        }

        setData(responseData || []);
        setPagination({
          currentPage: paginationData?.currentPage || 1,
          totalPages: paginationData?.totalPages || 1,
          totalCount: paginationData?.totalCount || 0,
          pageSize: paginationData?.pageSize || pagination.pageSize,
          hasNextPage: paginationData?.hasNextPage || false,
          hasPreviousPage: paginationData?.hasPreviousPage || false
        });
      } else {
        throw new Error(response.data?.message || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error refreshing with page adjustment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [fetchData, pagination.currentPage, pagination.pageSize, currentFilters, filters, endpoint]);

  const search = useCallback((searchFilters) => {
    setCurrentFilters(searchFilters);
    fetchData(1, pagination.pageSize, searchFilters); // Go to first page when searching
  }, [fetchData, pagination.pageSize]);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Data
    data,
    pagination,
    loading,
    error,

    // Actions
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    refresh,
    refreshWithPageAdjustment,
    search,

    // Computed values for convenience
    isEmpty: data.length === 0 && !loading,
    isFirstPage: pagination.currentPage === 1,
    isLastPage: pagination.currentPage === pagination.totalPages,
    totalItems: pagination.totalCount,
    hasData: data.length > 0
  };
};