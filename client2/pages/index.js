import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MerkmalTable from '../components/MerkmalTable';
import FilterPanel from '../components/FilterPanel';
import SettingsModal from '../components/SettingsModal';
import MerkmalForm from '../components/MerkmalForm';
import IdentnrCloneModal from '../components/IdentnrCloneModal';
import { useDarkMode } from '../hooks/useDarkMode';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { getSonderAbtDisplay } from '../utils/sonderAbtUtils';
import { getApiUrl, getApiUrlWithCacheBust } from '../config/api';
import { useFrontendPagination } from '../hooks/useFrontendPagination';

// Utility function to generate virtual groupId
const generateGroupId = (merkmal, auspraegung, drucktext, identnrList) => {
  const combinedString = `${merkmal || ''}|${auspraegung || ''}|${drucktext || ''}|${(identnrList || []).sort().join(',')}`;
  // Simple hash function (FNV-1a)
  let hash = 2166136261;
  for (let i = 0; i < combinedString.length; i++) {
    hash = hash ^ combinedString.charCodeAt(i);
    hash = hash * 16777619;
  }
  return (hash >>> 0).toString(16); // Convert to positive hex
};

export default function Home() {
  // Dark mode hook
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Mock data for fallback
  const mockData = [
    {
      id: 1,
      identnr: 'TEST001',
      merkmal: 'Farbe',
      auspraegung: 'Rot',
      drucktext: 'Rot lackiert',
      sondermerkmal: 'UV-beständig',
      merkmalsposition: 1,
      maka: 3,
      fertigungsliste: 1
    },
    {
      id: 2,
      identnr: 'TEST002',
      merkmal: 'Material',
      auspraegung: 'Aluminium',
      drucktext: 'Aluminium eloxiert',
      sondermerkmal: '',
      merkmalsposition: 2,
      maka: 1,
      fertigungsliste: 0
    }
  ];

  // Error handling with fallback data
  const {
    error,
    loading,
    setError,
    setLoading,
    clearError,
    safeApiCall,
    validateDuplicatePrevention
  } = useErrorHandler({
    fallbackData: mockData,
    showFallback: true
  });

  // Data state
  const [merkmalstexte, setMerkmalstexte] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // Core state
  const [editingItem, setEditingItem] = useState(null);
  const [operationLoading, setOperationLoading] = useState({
    create: false,
    update: false,
    delete: false,
    copy: false
  });

  const recordsPerPage = 50;

  // Column filters state (for quick filtering in table headers)
  const [columnFilters, setColumnFilters] = useState({
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
  });

  // Applied column filters (actually used for filtering)
  const [appliedColumnFilters, setAppliedColumnFilters] = useState({
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
  });

  // Form state - sadece inline edit için
  const [formData, setFormData] = useState({
    identnr: '',
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '0',
    fertigungsliste: '0'
  });

  // UI state
  const [successMessage, setSuccessMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Settings state
  const [showSettings, setShowSettings] = useState(false);

  // Identnr clone modal state
  const [showIdentnrCloneModal, setShowIdentnrCloneModal] = useState(false);
  const [cloneError, setCloneError] = useState(null);


  // Copied group data state
  const [copiedGroupData, setCopiedGroupData] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedIdentnrs, setSelectedIdentnrs] = useState([]);
  const [showIdentnrDropdown, setShowIdentnrDropdown] = useState(false);
  const [customIdentnr, setCustomIdentnr] = useState('');

  // Inline edit state
  const [selectedInlineIdentnrs, setSelectedInlineIdentnrs] = useState([]);
  const [showInlineDropdown, setShowInlineDropdown] = useState(false);
  const [customInlineIdentnr, setCustomInlineIdentnr] = useState('');

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterData, setFilterData] = useState({
    identnr: '',
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
  });
  const [selectedFilterIdentnrs, setSelectedFilterIdentnrs] = useState([]);
  const [showFilterIdentnrDropdown, setShowFilterIdentnrDropdown] = useState(false);
  const [customFilterIdentnr, setCustomFilterIdentnr] = useState('');
  const [allIdentnrs, setAllIdentnrs] = useState([]); // Will load from API

  // API Base
  const API_BASE = getApiUrl('/merkmalstexte');
  const BASE_URL = getApiUrl();

  // Data fetching with centralized error handling
  const fetchMerkmalstexte = async (forceRefresh = false) => {
    const result = await safeApiCall(
      async () => {
        const apiUrl = forceRefresh
          ? getApiUrlWithCacheBust('/grouped/merkmalstexte')
          : `${getApiUrl()}/grouped/merkmalstexte`;

        const fetchOptions = forceRefresh
          ? { cache: 'no-cache', headers: { 'Cache-Control': 'no-cache' } }
          : {};

        const response = await fetch(apiUrl, fetchOptions);
        const data = await response.json();

        if (!data.success) {
          throw new Error('API returned unsuccessful response');
        }

        // Add groupId to each group data
        const processedData = (data.data.data || []).map(item => {
          if (item._groupData && item._groupData.identnr_list) {
            const identnrList = item._groupData.identnr_list.split(',').map(id => id.trim());
            const groupId = generateGroupId(item.merkmal, item.auspraegung, item.drucktext, identnrList);
            return {
              ...item,
              _groupData: {
                ...item._groupData,
                groupId: groupId
              }
            };
          }
          return item;
        });

        return { processedData, totalCount: data.data.totalCount || 0 };
      },
      'Fetch Merkmalstexte',
      (result) => {
        // Success callback
        setMerkmalstexte(result.processedData);
        setTotalRecords(result.totalCount);
      },
      () => {
        // Error callback - fallback to mock data
        setMerkmalstexte(mockData);
        setTotalRecords(mockData.length);
      }
    );

    return result;
  };

  // Computed values
  const hasData = merkmalstexte && merkmalstexte.length > 0;

  // Apply column filters first
  const filteredMerkmalstexte = React.useMemo(() => {
    if (!merkmalstexte) return [];

    return merkmalstexte.filter(item => {
      return Object.entries(appliedColumnFilters).every(([field, filterValue]) => {
        if (!filterValue || !filterValue.toString().trim()) return true; // No filter applied or empty/whitespace only

        // Special handling for sonderAbt and fertigungsliste - exact match
        if (field === 'sonderAbt') {
          const itemSonderAbt = (item.sonderAbt || item.maka)?.toString();
          return itemSonderAbt === filterValue;
        }

        if (field === 'fertigungsliste') {
          const itemFertigungsliste = item.fertigungsliste?.toString();
          return itemFertigungsliste === filterValue;
        }

        // Text search for other fields (trim both values)
        const itemValue = item[field]?.toString().trim().toLowerCase() || '';
        return itemValue.includes(filterValue.toString().trim().toLowerCase());
      });
    });
  }, [merkmalstexte, appliedColumnFilters]);

  // Then apply sorting
  const sortedMerkmalstexte = React.useMemo(() => {
    if (!filteredMerkmalstexte || !sortConfig.key) return filteredMerkmalstexte;

    return [...filteredMerkmalstexte].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (sortConfig.direction === 'asc') {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });
  }, [filteredMerkmalstexte, sortConfig]);


  // Use frontend pagination hook
  const pagination = useFrontendPagination(sortedMerkmalstexte || [], recordsPerPage);
  const {
    paginatedData: currentData,
    currentPage,
    pageInput,
    totalPages,
    handlePageChange,
    handlePreviousPage,
    handleNextPage,
    handlePageInputChange,
    handlePageInputSubmit,
    handlePageInputKeyPress,
    getPaginationNumbers,
    resetToFirstPage,
    displayInfo
  } = pagination;

  // Keep legacy variable for compatibility
  const filteredTotalRecords = sortedMerkmalstexte?.length || 0;


  // Fetch all identnrs from API
  const fetchAllIdentnrs = async () => {
    return await safeApiCall(
      async () => {
        const response = await fetch(`${API_BASE}/list/identnrs`);
        const data = await response.json();

        if (!data.success) {
          throw new Error('API returned unsuccessful response');
        }

        return data.data || [];
      },
      'Fetch All Identnrs',
      (identnrs) => setAllIdentnrs(identnrs),
      () => setAllIdentnrs([])
    );
  };

  // Initialize data and settings
  useEffect(() => {
    fetchMerkmalstexte();
    fetchAllIdentnrs();

    // Dark mode is handled by the useDarkMode hook
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside inline dropdown
      if (showInlineDropdown) {
        const dropdownElement = event.target.closest('.identnr-dropdown-trigger, .identnr-dropdown-menu');
        if (!dropdownElement) {
          setShowInlineDropdown(false);
        }
      }

      // Check if click is outside filter dropdown
      if (showFilterIdentnrDropdown) {
        const filterDropdownElement = event.target.closest('.filter-identnr-dropdown-trigger, .filter-identnr-dropdown-menu');
        if (!filterDropdownElement) {
          setShowFilterIdentnrDropdown(false);
        }
      }

      // Check if click is outside form dropdown
      if (showIdentnrDropdown) {
        const formDropdownElement = event.target.closest('.form-identnr-dropdown-trigger, .form-identnr-dropdown-menu');
        if (!formDropdownElement) {
          setShowIdentnrDropdown(false);
        }
      }
    };

    // Add event listener when any dropdown is open
    if (showInlineDropdown || showFilterIdentnrDropdown || showIdentnrDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInlineDropdown, showFilterIdentnrDropdown, showIdentnrDropdown]);

  // Utility functions
  const showSuccess = (message) => {
    setSuccessMessage(message);

    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

  // Use shared error handler instead of custom function
  const handleApiError = (err, defaultMessage) => {
    const message = err.response?.data?.message || err.message || defaultMessage;
    setError(message);
    console.error(message, err);
  };

  const resetForm = () => {
    setFormData({
      identnr: '',
      merkmal: '',
      auspraegung: '',
      drucktext: '',
      sondermerkmal: '',
      position: '',
      sonderAbt: '0',
      fertigungsliste: '0'
    });
    setEditingItem(null);
    setSelectedInlineIdentnrs([]);
    setShowInlineDropdown(false);
    setCustomInlineIdentnr('');
  };


  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${type} erfolgreich kopiert: ${text}`);
    } catch (err) {
      // Copy failed - silently ignore
    }
  };

  // Event handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };



  // Column filter handlers
  const handleColumnFilterChange = (field, value) => {
    if (field === 'apply') {
      // Apply filters - copy current inputs to applied filters
      const newFilters = { ...columnFilters };
      setAppliedColumnFilters(newFilters);
      resetToFirstPage();

      // Close any open editing modals when filters change
      if (editingItem) {
        resetForm();
      }


    } else if (field === 'clear') {
      // Clear all filters
      setColumnFilters({
        merkmal: '',
        auspraegung: '',
        drucktext: '',
        sondermerkmal: '',
        position: '',
        sonderAbt: '',
        fertigungsliste: ''
      });
      setAppliedColumnFilters({
        merkmal: '',
        auspraegung: '',
        drucktext: '',
        sondermerkmal: '',
        position: '',
        sonderAbt: '',
        fertigungsliste: ''
      });

      // Reset page and reload grouped data
      resetToFirstPage();

      // Reload original grouped data to clear any search results
      fetchMerkmalstexte();

      // Close any open editing modals when filters are cleared
      if (editingItem) {
        resetForm();
      }


    } else {
      // Just update input values, don't apply filtering yet
      setColumnFilters(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleEdit = (item) => {
    if (editingItem && editingItem.id === item.id) {
      resetForm();
      return;
    }

    setEditingItem(item);
    setFormData({
      identnr: item.identnr,
      merkmal: item.merkmal,
      auspraegung: item.auspraegung,
      drucktext: item.drucktext,
      sondermerkmal: item.sondermerkmal || '',
      position: item.position || '',
      sonderAbt: item.sonderAbt?.toString() || '0',
      fertigungsliste: item.fertigungsliste?.toString() || '0'
    });

    // Set selected identnrs for this group from _groupData
    if (item._groupData && item._groupData.identnr_list) {
      const identnrs = item._groupData.identnr_list.split(',').map(id => id.trim());
      setSelectedInlineIdentnrs(identnrs);
    } else {
      // For single record, set its identnr as selected
      setSelectedInlineIdentnrs([item.identnr]);
    }
  };

  const handleDelete = async (item) => {
    const { id, identnr, merkmal, auspraegung, drucktext } = item;
    const recordCount = item._groupData?.record_count || 1;

    // Handle ghost records - records that exist in frontend but not in backend
    if (item._groupData && (!item._groupData.id_list || item._groupData.record_count === 0)) {
      showSuccess(`✅ Geist-Datensatz entfernt`);
      // Refresh data while preserving filter view state
      if (showFilters) {
        await handleFilterSearch();
      } else {
        await fetchMerkmalstexte();
      }
      return;
    }
    // Remove duplicates from identnr list for display
    const rawIdentnrList = item._groupData?.identnr_list || item.identnr || '';
    const identnrList = rawIdentnrList ? rawIdentnrList.split(',').map(id => id.trim()).filter((id, index, arr) => arr.indexOf(id) === index).join(',') : '';


    const confirmMessage = recordCount > 1
      ? `Möchten Sie die gesamte Gruppe "${merkmal} - ${auspraegung}" mit ${recordCount} Datensätzen (Ident-Nr: ${identnrList}) wirklich löschen?`
      : `Möchten Sie den Datensatz "${merkmal} - ${auspraegung}" (Ident-Nr: ${item.identnr || identnrList}) wirklich löschen?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setOperationLoading(prev => ({ ...prev, delete: true }));

      let response;

      // In grouped view, always use bulk endpoint (even for single record groups)
      // because item.id is row number, not database ID
      response = await fetch(`${getApiUrl()}/grouped/merkmalstexte/bulk-delete-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupData: {
            id_list: item._groupData?.id_list || String(item.id),
            groupId: item._groupData?.groupId || `single_${item.id}`
          }
        })
      });

      if (!response.ok) {
        // 404 is acceptable - record might already be deleted
        if (response.status === 404) {
          // Continue with success flow - record already deleted
        } else {
          const errorData = await response.text();
          console.error('Delete failed:', response.status, errorData);
          throw new Error(`Delete failed: ${response.status} - ${errorData}`);
        }
      }

      let result = null;
      let deletedCount = recordCount;

      if (response.ok) {
        result = await response.json();
        deletedCount = result.data?.deletedCount || recordCount;
      } else if (response.status === 404) {
        // For 404, assume 1 record was "deleted" (already gone)
        deletedCount = 1;
      }

      if (recordCount === 1) {
        showSuccess(`✅ Datensatz erfolgreich gelöscht`);
      } else {
        showSuccess(`✅ ${deletedCount} Datensätze der Gruppe erfolgreich gelöscht`);
      }

      // Refresh data while preserving filter view state
      if (showFilters) {
        // If filter modal is open, refresh filtered data
        await handleFilterSearch();
      } else {
        // Otherwise refresh grouped data
        await fetchMerkmalstexte();
      }
    } catch (err) {
      handleApiError(err, 'Fehler beim Löschen');
    } finally {
      setOperationLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // Inline edit handlers
  const handleInlineDropdownToggle = () => {
    setShowInlineDropdown(!showInlineDropdown);
  };

  const handleCustomInlineIdentnrChange = (value) => {
    setCustomInlineIdentnr(value);
  };

  const handleAddCustomInlineIdentnr = () => {
    const newIdentnr = customInlineIdentnr.trim();
    if (newIdentnr && !selectedInlineIdentnrs.includes(newIdentnr)) {
      setSelectedInlineIdentnrs([...selectedInlineIdentnrs, newIdentnr]);
      setCustomInlineIdentnr('');
    }
  };

  const handleToggleInlineIdentnrSelection = (identnr) => {
    if (selectedInlineIdentnrs.includes(identnr)) {
      setSelectedInlineIdentnrs(selectedInlineIdentnrs.filter(id => id !== identnr));
    } else {
      setSelectedInlineIdentnrs([...selectedInlineIdentnrs, identnr]);
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingItem) return;

    try {
      setOperationLoading(prev => ({ ...prev, update: true }));

      // Get original identnrs from group data
      const originalIdentnrs = editingItem._groupData?.identnr_list
        ? editingItem._groupData.identnr_list.split(',').map(id => id.trim())
        : [];

      const currentIdentnrs = selectedInlineIdentnrs;


      // Remove duplicates from arrays before calculation
      const uniqueOriginalIdentnrs = [...new Set(originalIdentnrs)];
      const uniqueCurrentIdentnrs = [...new Set(currentIdentnrs)];

      // Find identnrs to add (selected but not in original)
      const identnrsToAdd = uniqueCurrentIdentnrs.filter(id => !uniqueOriginalIdentnrs.includes(id));

      // Find identnrs to remove (in original but not selected)
      const identnrsToRemove = uniqueOriginalIdentnrs.filter(id => !uniqueCurrentIdentnrs.includes(id));

      // Find identnrs to update (in both lists)
      const identnrsToUpdate = uniqueCurrentIdentnrs.filter(id => uniqueOriginalIdentnrs.includes(id));


      // 1. Create new records for added identnrs
      // Use the same position as the existing group to ensure they stay grouped together
      const groupPosition = editingItem.position; // Use original group's position

      // Use bulk copy endpoint to ensure same position for all identnrs
      if (identnrsToAdd.length > 0) {

        const copyResponse = await fetch(`${getApiUrl()}/grouped/merkmalstexte/create-from-copy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            records: [formData], // Current form data as template
            targetIdentnrs: identnrsToAdd // New identnrs to create
          })
        });

        if (!copyResponse.ok) {
          throw new Error(`Failed to copy record to new identnrs`);
        }
      }

      // 2. Delete records for removed identnrs
      for (const identnr of identnrsToRemove) {
        const deleteResponse = await fetch(`${API_BASE}/identnr/${identnr}`, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          // 404 is acceptable - identnr might already be deleted or not exist
          if (deleteResponse.status !== 404) {
            const errorText = await deleteResponse.text();
            console.error(`❌ Delete failed for identnr ${identnr}:`, errorText);
            throw new Error(`Failed to delete records for identnr: ${identnr}`);
          }
        }
      }

      // 3. Update existing records (bulk update all records with same merkmal/auspraegung/drucktext)
      if (identnrsToUpdate.length > 0) {
        // Use the getSimilarDatasets endpoint to get all related records
        // Use first real database ID from id_list
        const firstRealId = editingItem._groupData?.id_list?.split(',')[0] || editingItem.id;
        const similarResponse = await fetch(`${API_BASE}/${firstRealId}/similar`);
        if (similarResponse.ok) {
          const similarData = await similarResponse.json();

          if (similarData.success && similarData.data) {
            // Get records array from the response structure
            const records = similarData.data.records || [];

            // Update each related record
            for (const record of records) {
              // Only update if the identnr is in the selected list
              if (identnrsToUpdate.includes(record.identnr)) {

                const updateData = {
                  identnr: record.identnr, // Add required identnr field
                  merkmal: formData.merkmal,
                  auspraegung: formData.auspraegung,
                  drucktext: formData.drucktext,
                  sondermerkmal: formData.sondermerkmal || '',
                  position: formData.position ? parseInt(formData.position) : 0,
                  sonderAbt: parseInt(formData.sonderAbt) || 0,
                  fertigungsliste: parseInt(formData.fertigungsliste) || 0
                };


                const updateResponse = await fetch(`${API_BASE}/${record.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(updateData)
                });

                if (!updateResponse.ok) {
                  const errorText = await updateResponse.text();
                  console.error(`❌ Update failed for record ${record.id}:`, errorText);
                  throw new Error(`Failed to update record ID: ${record.id}`);
                }
              }
            }
          }
        }
      }

      // Success message
      const totalOps = identnrsToAdd.length + identnrsToRemove.length + identnrsToUpdate.length;
      showSuccess(`✅ Bulk operation erfolgreich: ${identnrsToAdd.length} hinzugefügt, ${identnrsToRemove.length} gelöscht, ${identnrsToUpdate.length} aktualisiert`);

      resetForm();
      // Refresh data while preserving filter view state
      if (showFilters) {
        // If filter modal is open, refresh filtered data
        await handleFilterSearch();
      } else {
        // Otherwise refresh grouped data
        await fetchMerkmalstexte();
      }

    } catch (err) {
      handleApiError(err, 'Fehler bei Bulk-Operation');
    } finally {
      setOperationLoading(prev => ({ ...prev, update: false }));
    }
  };

  // Group copy handler
  const handleCopyGroupData = async (item) => {
    try {
      setOperationLoading(prev => ({ ...prev, copy: true }));

      // Prepare copy request data
      const copyData = {
        merkmal: item.merkmal,
        auspraegung: item.auspraegung,
        drucktext: item.drucktext,
        sondermerkmal: item.sondermerkmal === 'EMPTY' ? '' : item.sondermerkmal,
        position: item.merkmalsposition,
        sonderAbt: item.sonderAbt,
        maka: item.maka
      };

      // Call copy API
      const response = await fetch(`${getApiUrl()}/grouped/merkmalstexte/copy-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(copyData)
      });

      if (!response.ok) {
        throw new Error(`Failed to copy group data: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Store copied data in localStorage or state for pasting later
        const groupCriteria = result.data.groupCriteria;
        const records = result.data.records || [];
        const firstRecord = records[0] || {};

        const copiedGroupData = {
          merkmal: groupCriteria.merkmal,
          auspraegung: groupCriteria.auspraegung,
          drucktext: groupCriteria.drucktext,
          sondermerkmal: groupCriteria.sondermerkmal,
          position: firstRecord.merkmalsposition || 0,
          maka: firstRecord.maka || firstRecord.sonderAbt || 0,
          fertigungsliste: firstRecord.fertigungsliste || 0,
          identnrList: records.map(r => r.identnr),
          recordCount: result.data.recordCount,
          copiedAt: new Date().toISOString()
        };

        localStorage.setItem('copiedGroupData', JSON.stringify(copiedGroupData));

        // Auto-load the copied data into form and open the form modal
        setCopiedGroupData(copiedGroupData);

        // Fill form with copied data
        setFormData(prev => ({
          ...prev,
          merkmal: copiedGroupData.merkmal,
          auspraegung: copiedGroupData.auspraegung,
          drucktext: copiedGroupData.drucktext,
          sondermerkmal: copiedGroupData.sondermerkmal || '',
          position: copiedGroupData.position || '',
          sonderAbt: copiedGroupData.maka || '0',
          fertigungsliste: copiedGroupData.fertigungsliste || '0'
        }));

        // Set identnrs from copied group as selected
        setSelectedIdentnrs(copiedGroupData.identnrList || []);

        // Open the form modal
        setEditingItem(null); // Ensure we're in create mode
        setShowForm(true);

        showSuccess(`✅ Gruppe erfolgreich kopiert und bereit zum Einfügen!\n🏷️ ${copiedGroupData.identnrList?.length || 0} Ident-Nr ausgewählt (${copiedGroupData.recordCount} Datensätze)`);
      } else {
        throw new Error(result.message || 'Failed to copy group data');
      }

    } catch (err) {
      handleApiError(err, 'Fehler beim Kopieren der Gruppe');
    } finally {
      setOperationLoading(prev => ({ ...prev, copy: false }));
    }
  };


  // Handle identnr clone
  const handleIdentnrClone = async ({ sourceIdentnr, targetIdentnr }) => {
    try {
      setOperationLoading(prev => ({ ...prev, clone: true }));
      setCloneError(null); // Clear any previous errors

      const response = await fetch(`${BASE_URL}/identnrs/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sourceIdentnr, targetIdentnr })
      });

      const result = await response.json();

      if (result.success) {
        showSuccess(`✅ Identnr erfolgreich geklont!\n📄 ${result.data.recordCount} neue Datensätze für "${targetIdentnr}" erfolgreich erstellt`);
        setShowIdentnrCloneModal(false);
        setCloneError(null);

        // Refresh data to show the new cloned records
        await fetchMerkmalstexte();

        // Also refresh identnr list for filter dropdown
        await fetchAllIdentnrs();
      } else {
        // Handle specific backend error messages
        let userFriendlyMessage = result.message;

        if (result.message && result.message.includes('hat bereits Datensätze')) {
          userFriendlyMessage = `Die Ziel-Identnr "${targetIdentnr}" enthält bereits Datensätze. Bitte wählen Sie eine andere Identnr oder löschen Sie zunächst die bestehenden Datensätze.`;
        } else if (result.message && result.message.includes('nicht gefunden')) {
          userFriendlyMessage = `Die Quell-Identnr "${sourceIdentnr}" wurde nicht gefunden oder enthält keine Datensätze.`;
        }

        setCloneError(userFriendlyMessage);
      }

    } catch (err) {
      console.error('Clone error:', err);
      setCloneError('Es ist ein unerwarteter Fehler beim Klonen aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setOperationLoading(prev => ({ ...prev, clone: false }));
    }
  };

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setFilterData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterIdentnrDropdownToggle = () => {
    setShowFilterIdentnrDropdown(!showFilterIdentnrDropdown);
  };

  const handleCustomFilterIdentnrChange = (value) => {
    setCustomFilterIdentnr(value);
  };

  const handleToggleFilterIdentnrSelection = (identnr) => {
    // Only allow single selection for simplicity
    if (selectedFilterIdentnrs.includes(identnr)) {
      setSelectedFilterIdentnrs([]);
    } else {
      setSelectedFilterIdentnrs([identnr]);
    }
  };

  const handleRemoveFilterIdentnr = () => {
    setSelectedFilterIdentnrs([]);
  };

  const handleFilterSearch = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = new URLSearchParams();

      // Add filter parameters (trim whitespace)
      if (filterData.merkmal && filterData.merkmal.trim()) params.append('merkmal', filterData.merkmal.trim());
      if (filterData.auspraegung && filterData.auspraegung.trim()) params.append('auspraegung', filterData.auspraegung.trim());
      if (filterData.drucktext && filterData.drucktext.trim()) params.append('drucktext', filterData.drucktext.trim());
      if (filterData.sondermerkmal && filterData.sondermerkmal.trim()) params.append('sondermerkmal', filterData.sondermerkmal.trim());
      if (filterData.position && filterData.position.toString().trim()) params.append('position', filterData.position.toString().trim());
      if (filterData.sonderAbt && filterData.sonderAbt.toString().trim()) params.append('sonderAbt', filterData.sonderAbt.toString().trim());
      if (filterData.fertigungsliste && filterData.fertigungsliste.toString().trim()) params.append('fertigungsliste', filterData.fertigungsliste.toString().trim());

      // Add selected Ident-Nr if any
      if (selectedFilterIdentnrs.length > 0) {
        params.append('identnr', selectedFilterIdentnrs[0]); // Only one allowed
      }

      params.append('limit', '300000'); // Very high limit to get all results

      const response = await fetch(`${API_BASE}/filter?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMerkmalstexte(data.data.data || []);
        const count = data.data.pagination?.totalCount || 0;
        setTotalRecords(count);
        showSuccess(`🔍 ${count} Datensätze gefunden`);
      } else {
        setError('Filter-Suche fehlgeschlagen');
      }
    } catch (err) {
      setError('Fehler beim Filtern der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    // Clear all filter states
    setFilterData({
      identnr: '',
      merkmal: '',
      auspraegung: '',
      drucktext: '',
      sondermerkmal: '',
      position: '',
      sonderAbt: '',
      fertigungsliste: ''
    });
    setSelectedFilterIdentnrs([]);
    setCustomFilterIdentnr('');

    // Close filter panel and return to grouped view
    setShowFilters(false);
    fetchMerkmalstexte();
    showSuccess('🗑️ Filter gelöscht - Zurück zur Gruppenansicht');
  };

  // Computed filter values
  const filteredFilterIdentnrs = customFilterIdentnr
    ? allIdentnrs.filter(identnr =>
        identnr.toLowerCase().includes(customFilterIdentnr.toLowerCase())
      )
    : allIdentnrs;

  // Settings handlers
  const handleToggleDarkMode = () => {
    toggleDarkMode();
    showSuccess(isDarkMode ? '☀️ Light Mode aktiviert' : '🌙 Dark Mode aktiviert');
  };


  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  // Form handlers
  const handleShowCreateForm = () => {
    setEditingItem(null);
    resetForm();
    setSelectedIdentnrs([]);
    setCustomIdentnr('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.merkmal || !formData.auspraegung || !formData.drucktext || selectedIdentnrs.length === 0) {
      alert('Bitte füllen Sie alle Pflichtfelder aus: Ident-Nr., Merkmal, Ausprägung und Drucktext');
      return;
    }

    // Check for duplicate prevention
    const duplicateValidation = validateDuplicatePrevention(formData, selectedIdentnrs, copiedGroupData);
    if (!duplicateValidation.isValid) {
      return;
    }

    try {
      setOperationLoading(prev => ({ ...prev, create: true }));

      // Create record for first identnr, then copy to others to ensure same position
      const [firstIdentnr, ...otherIdentnrs] = selectedIdentnrs;

      // Create the first record
      const firstResponse = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identnr: firstIdentnr,
          merkmal: formData.merkmal,
          auspraegung: formData.auspraegung,
          drucktext: formData.drucktext,
          sondermerkmal: formData.sondermerkmal || '',
          position: formData.position ? parseInt(formData.position) : 0,
          sonderAbt: formData.sonderAbt || '0',
          fertigungsliste: formData.fertigungsliste || '0'
        })
      });

      if (!firstResponse.ok) {
        const errorData = await firstResponse.json();
        const errorMessage = errorData.errors?.[0] || errorData.message || `Failed to create record for ${firstIdentnr}`;
        setError(errorMessage);
        return;
      }

      const firstRecord = await firstResponse.json();
      const recordId = firstRecord.data.id;


      // If there are other identnrs, copy the first record to them
      if (otherIdentnrs.length > 0) {
        const copyResponse = await fetch(`${API_BASE}/${recordId}/copy-to-identnrs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identnrs: selectedIdentnrs // All identnrs including the first one
          })
        });

        if (!copyResponse.ok) {
          throw new Error(`Failed to copy record to other identnrs`);
        }

        const copyResult = await copyResponse.json();
      }

      // Success
      const count = selectedIdentnrs.length;
      const identnrList = selectedIdentnrs.join(', ');
      showSuccess(`✅ ${count} Datensatz${count > 1 ? 'e' : ''} erfolgreich erstellt für: ${identnrList}`);

      setError(''); // Clear any previous errors
      setShowForm(false);
      resetForm();
      setSelectedIdentnrs([]);
      setCustomIdentnr('');

      // Refresh data
      await fetchMerkmalstexte();

    } catch (err) {
      handleApiError(err, 'Fehler beim Erstellen der Datensätze');
    } finally {
      setOperationLoading(prev => ({ ...prev, create: false }));
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    resetForm();
    setSelectedIdentnrs([]);
    setCustomIdentnr('');
  };

  const handleIdentnrDropdownToggle = () => {
    setShowIdentnrDropdown(!showIdentnrDropdown);
  };

  const handleCustomIdentnrChange = (value) => {
    setCustomIdentnr(value);
  };

  const handleCustomIdentnrKeyDown = (e) => {
    if (e.key === 'Enter' && customIdentnr.trim()) {
      e.preventDefault();
      handleAddCustomIdentnr();
    }
  };

  const handleAddCustomIdentnr = () => {
    const newIdentnr = customIdentnr.trim();
    if (newIdentnr && !selectedIdentnrs.includes(newIdentnr)) {
      setSelectedIdentnrs([...selectedIdentnrs, newIdentnr]);
      setCustomIdentnr('');
    }
  };

  const handleToggleIdentnrSelection = (identnr) => {
    if (selectedIdentnrs.includes(identnr)) {
      setSelectedIdentnrs(selectedIdentnrs.filter(id => id !== identnr));
    } else {
      setSelectedIdentnrs([...selectedIdentnrs, identnr]);
    }
  };

  // Computed form values - show all identnrs, selected ones will be checked
  const filteredIdentnrs = customIdentnr
    ? allIdentnrs.filter(identnr =>
        identnr.toLowerCase().includes(customIdentnr.toLowerCase())
      )
    : allIdentnrs;

  return (
    <div className="container">
      <Head>
        <title>Merkmalstexte Verwaltung</title>
        <meta name="description" content="Merkmalstexte CRUD Anwendung" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="app-header">
        <h1>Merkmalstexte Verwaltung</h1>
        <div className="header-controls">
          <div className="action-buttons">
            <button
              className="btn btn-success"
              onClick={handleShowCreateForm}
              title="Neuen Datensatz erstellen"
            >
              ➕
            </button>

            <button
              className="btn btn-info"
              onClick={() => {
                if (showFilters) {
                  // Filter panel kapatılıyorsa filtreleri temizle
                  handleClearFilters();
                }
                setShowFilters(!showFilters);
              }}
              title="Filter Panel"
            >
              🔍
            </button>

            <button
              className="btn btn-info"
              onClick={() => fetchMerkmalstexte(true)}
              disabled={loading}
              title="Daten aktualisieren"
            >
              🔄
            </button>

            <button
              className="btn btn-info"
              onClick={() => setShowIdentnrCloneModal(true)}
              title="Identnr Klonen"
            >
              🏷️
            </button>

            <button
              className="btn btn-info"
              onClick={() => setShowSettings(!showSettings)}
              title="Einstellungen"
            >
              ⚙️
            </button>

          </div>
        </div>
      </header>

      {/* Fixed position toast notifications */}
      {error && (
        <div className="toast-message toast-error" style={{position: 'relative', paddingRight: '3rem'}}>
          ❌ Fehler: {error}
          <button
            onClick={() => setError('')}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="toast-message toast-success">
          {successMessage}
        </div>
      )}

      <main className="app-main">

        <FilterPanel
          showFilters={showFilters}
          filterData={filterData}
          selectedFilterIdentnrs={selectedFilterIdentnrs}
          showFilterIdentnrDropdown={showFilterIdentnrDropdown}
          customFilterIdentnr={customFilterIdentnr}
          filteredFilterIdentnrs={filteredFilterIdentnrs}
          loading={loading}
          onFilterChange={handleFilterChange}
          onDropdownToggle={handleFilterIdentnrDropdownToggle}
          onCustomFilterIdentnrChange={handleCustomFilterIdentnrChange}
          onToggleFilterIdentnrSelection={handleToggleFilterIdentnrSelection}
          onRemoveFilterIdentnr={handleRemoveFilterIdentnr}
          onSearch={handleFilterSearch}
          onClearFilters={handleClearFilters}
        />

        <SettingsModal
          showSettings={showSettings}
          darkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onClose={handleCloseSettings}
        />

        <IdentnrCloneModal
          showModal={showIdentnrCloneModal}
          allIdentnrs={allIdentnrs}
          operationLoading={operationLoading}
          onClose={() => {
            setShowIdentnrCloneModal(false);
            setCloneError(null); // Clear error when closing modal
          }}
          onClone={handleIdentnrClone}
          errorMessage={cloneError}
          clearError={() => setCloneError(null)}
        />

        <MerkmalForm
          showForm={showForm}
          editingItem={editingItem}
          formData={formData}
          selectedIdentnrs={selectedIdentnrs}
          showIdentnrDropdown={showIdentnrDropdown}
          customIdentnr={customIdentnr}
          filteredIdentnrs={filteredIdentnrs}
          originalRecord={editingItem}
          operationLoading={operationLoading}
          copiedGroupData={copiedGroupData}
          onSubmit={handleFormSubmit}
          onInputChange={handleInputChange}
          onDropdownToggle={handleIdentnrDropdownToggle}
          onCustomIdentnrChange={handleCustomIdentnrChange}
          onCustomIdentnrKeyDown={handleCustomIdentnrKeyDown}
          onAddCustomIdentnr={handleAddCustomIdentnr}
          onToggleIdentnrSelection={handleToggleIdentnrSelection}
          onCancel={handleFormCancel}
        />

        <section className="data-section">
          <div className="data-header">
            <h3>{merkmalstexte && merkmalstexte.length > 0 && merkmalstexte[0].identnr ? 'Datensätze' : 'Merkmal Gruppen'}</h3>
            {!loading && (
              <p className="data-info">
                {hasData
                  ? `${filteredTotalRecords.toLocaleString()} Datensätze (${currentData.length} angezeigt)${filteredTotalRecords !== totalRecords ? ` von ${totalRecords.toLocaleString()} gesamt` : ''}`
                  : 'Keine Daten verfügbar'
                }
              </p>
            )}
          </div>

          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Lade Daten...</p>
            </div>
          )}

          {!loading && !hasData && !error && (
            <div className="no-data">
              <p>📭 Keine Datensätze gefunden.</p>
            </div>
          )}

          <MerkmalTable
            data={currentData}
            loading={loading}
            hasData={hasData}
            sortConfig={sortConfig}
            editingItem={editingItem}
            formData={formData}
            columnFilters={columnFilters}
            selectedIdentnrs={selectedInlineIdentnrs}
            showInlineDropdown={showInlineDropdown}
            allIdentnrs={allIdentnrs}
            customIdentnr={customInlineIdentnr}
            operationLoading={operationLoading}
            showIdentnrColumn={currentData?.length > 0 && !currentData[0]?._groupData}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCopyToClipboard={copyToClipboard}
            onCopyGroupData={handleCopyGroupData}
            onInputChange={handleInputChange}
            onResetForm={resetForm}
            onColumnFilterChange={handleColumnFilterChange}
            onInlineDropdownToggle={handleInlineDropdownToggle}
            onCustomIdentnrChange={handleCustomInlineIdentnrChange}
            onToggleIdentnrSelection={handleToggleInlineIdentnrSelection}
            onAddCustomIdentnr={handleAddCustomInlineIdentnr}
            onUpdateRecord={handleUpdateRecord}
          />

          {/* Data Info */}
          {hasData && (
            <div style={{textAlign: 'center', margin: '15px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px'}}>
              <p style={{margin: 0, color: '#666'}}>
                Zeige {((currentPage - 1) * recordsPerPage) + 1}-{Math.min(currentPage * recordsPerPage, filteredTotalRecords)} von {filteredTotalRecords.toLocaleString()} gefilterten Datensätzen
                {filteredTotalRecords !== totalRecords && ` (${totalRecords.toLocaleString()} gesamt)`}
                ({recordsPerPage} pro Seite)
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {hasData && totalPages > 1 && (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                {/* Previous Arrow */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                    color: currentPage === 1 ? '#ccc' : '#333',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '4px'
                  }}
                  title="Vorherige Seite"
                >
                  ◀️
                </button>

                {/* Page Numbers */}
                {getPaginationNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${index}`} style={{padding: '8px 4px', color: '#666'}}>...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        backgroundColor: pageNum === currentPage ? '#007bff' : '#fff',
                        color: pageNum === currentPage ? '#fff' : '#333',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: pageNum === currentPage ? 'bold' : 'normal'
                      }}
                      title={`Seite ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}

                {/* Next Arrow */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
                    color: currentPage === totalPages ? '#ccc' : '#333',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: '4px'
                  }}
                  title="Nächste Seite"
                >
                  ▶️
                </button>

                {/* Page Input */}
                <div style={{marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '14px', color: '#666'}}>Gehe zu Seite:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => handlePageInputChange(e.target.value)}
                    onKeyPress={handlePageInputKeyPress}
                    placeholder={currentPage.toString()}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                    title={`Seitenzahl eingeben (1-${totalPages})`}
                  />
                  <button
                    onClick={handlePageInputSubmit}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #007bff',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Zur Seite gehen"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}