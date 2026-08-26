'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useDb } from '@/providers/DbContext';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Download,
  Filter,
  XCircle,
  Plus,
  RefreshCw,
  X,
  Loader2,
  Database,
  Grid,
  Settings,
  ChevronDown
} from 'lucide-react';

export default function DataPemantauan() {
  const { dbType, getHeaders, connectionStatus } = useDb();

  const [tablesList, setTablesList] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  
  // Data grid states
  const [records, setRecords] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);

  // Query / filters states
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(15);
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Advanced filters state
  const [activeFilters, setActiveFilters] = useState<{ field: string; value: string }[]>([]);
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // CRUD modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formRecord, setFormRecord] = useState<any>({});
  const [formLoading, setFormLoading] = useState(false);

  // Fetch tables registry
  const fetchTables = async () => {
    setTablesLoading(true);
    try {
      const headers = getHeaders();
      const res = await fetch('/api/tables', { headers });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setTablesList(data.data);
        // Auto select first table if none selected
        if (!selectedTable) {
          setSelectedTable(data.data[0].name);
        }
      } else {
        setTablesList([]);
        setSelectedTable('');
      }
    } catch (e) {
      console.error('Failed to load tables list:', e);
    } finally {
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [dbType, connectionStatus]);

  // Fetch table records
  const fetchRecords = useCallback(async () => {
    if (!selectedTable) {
      setRecords([]);
      setColumns([]);
      setMetadata(null);
      return;
    }
    setLoading(true);
    try {
      const headers = getHeaders();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortField,
        sortOrder
      });

      if (search) params.append('search', search);
      
      // Append active filters
      activeFilters.forEach((f) => {
        params.append(f.field, f.value);
      });

      const res = await fetch(`/api/tables/${selectedTable}?${params.toString()}`, { headers });
      const data = await res.json();
      
      if (data.success) {
        setRecords(data.data || []);
        const responseMeta = data.meta?.metadata || data.metadata;
        const responsePagination = data.meta?.pagination || data.pagination;
        
        setMetadata(responseMeta);
        setColumns(responseMeta?.columns || []);
        setTotalPages(responsePagination?.totalPages || 1);
        setTotalRecords(responsePagination?.total || 0);
      }
    } catch (e) {
      console.error('Failed to load table data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, limit, search, sortField, sortOrder, activeFilters, getHeaders]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Reset pagination on search or filters change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filterField || !filterValue) return;

    setActiveFilters([...activeFilters, { field: filterField, value: filterValue }]);
    setFilterField('');
    setFilterValue('');
    setPage(1);
    setShowFilterDropdown(false);
  };

  const handleRemoveFilter = (index: number) => {
    const updated = activeFilters.filter((_, idx) => idx !== index);
    setActiveFilters(updated);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Open Create Record Modal
  const openCreateModal = () => {
    setIsEditMode(false);
    const initial: any = {};
    columns.forEach((c) => {
      initial[c.name] = c.type === 'number' ? 0 : c.type === 'boolean' ? false : '';
    });
    setFormRecord(initial);
    setIsModalOpen(true);
  };

  // Open Edit Record Modal
  const openEditModal = (row: any) => {
    setIsEditMode(true);
    
    // Format dates for inputs
    const formatted = { ...row };
    columns.forEach((c) => {
      if (c.type === 'date' && formatted[c.name]) {
        formatted[c.name] = new Date(formatted[c.name]).toISOString().split('T')[0];
      }
    });

    setFormRecord(formatted);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (id: number) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus baris dengan ID ${id}?`)) return;
    try {
      const headers = getHeaders();
      const res = await fetch(`/api/tables/${selectedTable}/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        fetchRecords();
      } else {
        alert(data.message || 'Gagal menghapus rekaman.');
      }
    } catch (e: any) {
      alert('Error deleting record: ' + e.message);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const headers = getHeaders();
      const url = isEditMode 
        ? `/api/tables/${selectedTable}/${formRecord.id}` 
        : `/api/tables/${selectedTable}`;
      
      const method = isEditMode ? 'PUT' : 'POST';

      // Format payload types
      const payload = { ...formRecord };
      delete payload.id; // Avoid passing ID in create/update payloads

      columns.forEach((c) => {
        if (c.type === 'number') {
          payload[c.name] = Number(payload[c.name] || 0);
        } else if (c.type === 'boolean') {
          payload[c.name] = Boolean(payload[c.name]);
        } else if (c.type === 'date') {
          payload[c.name] = payload[c.name] ? new Date(payload[c.name]).toISOString() : null;
        }
      });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        fetchRecords();
      } else {
        alert(data.message || 'Gagal menyimpan data.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (records.length === 0) return;
    try {
      // Build headers
      const csvKeys = columns.map(c => c.name);
      const csvHeaderLine = csvKeys.map(k => `"${k.toUpperCase()}"`).join(',');

      // Build rows
      const csvRows = records.map((row) => {
        return csvKeys.map((key) => {
          let val = row[key];
          if (val === null || val === undefined) val = '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',');
      });

      const csvContent = [csvHeaderLine, ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedTable}_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Export CSV error: ' + e.message);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setActiveFilters([]);
    setSortField('id');
    setSortOrder('desc');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Data Pemantauan</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola seluruh rekaman pemantauan rekomendasi audit BPK dan tindak lanjut hasil pengawasan (CRUD).
          </p>
        </div>
        
        {selectedTable && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" /> Tambah Baris
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold hover:bg-slate-55 transition-all cursor-pointer text-slate-500 dark:text-slate-300"
            >
              <Download className="h-4 w-4" /> Ekspor CSV
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Tables Sidebar + Record Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Side: Dynamic Tables List */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-[#1D4ED8]" /> Daftar Tabel Data
          </h3>
          
          <div className="space-y-1">
            {tablesLoading ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : tablesList.length === 0 ? (
              <div className="text-xs text-slate-400 italic text-center py-8">
                Belum ada tabel data yang terintegrasi.
              </div>
            ) : (
              tablesList.map((t) => (
                <button
                   key={t.name}
                   onClick={() => {
                     setSelectedTable(t.name);
                     setActiveFilters([]);
                     setSearch('');
                     setPage(1);
                   }}
                   className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-all text-left ${
                     selectedTable === t.name
                       ? 'bg-blue-500/10 text-[#1D4ED8] border border-blue-500/10'
                       : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                   }`}
                >
                  <span className="truncate">{t.displayName}</span>
                  <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-550 px-1.5 py-0.5 rounded">
                    {t.rowCount}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Data Sheet Grid Editor */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Query Toolbar */}
          {selectedTable && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-sm space-y-3.5">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                
                <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                  {/* Search box */}
                  <div className="relative flex-1 sm:w-60 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-450" />
                    <input
                      type="text"
                      placeholder="Cari data pemantauan..."
                      value={search}
                      onChange={handleSearchChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-4 py-2 text-xs text-slate-800 dark:text-white focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  {/* Add Filters dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold hover:bg-slate-50 text-slate-650 dark:text-slate-300 cursor-pointer"
                    >
                      <Filter className="h-4 w-4" /> Filter <ChevronDown className="h-3 w-3" />
                    </button>

                    {showFilterDropdown && (
                      <form 
                        onSubmit={handleAddFilter}
                        className="absolute left-0 mt-2 w-64 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xl z-50 text-xs space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="font-bold text-slate-400 uppercase text-[9px]">Pilih Kolom</label>
                          <select
                            value={filterField}
                            onChange={(e) => setFilterField(e.target.value)}
                            required
                            className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded p-1.5 text-xs font-semibold focus:outline-none"
                          >
                            <option value="">-- Kolom --</option>
                            {columns.map(c => (
                              <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-400 uppercase text-[9px]">Nilai Filter</label>
                          <input
                            type="text"
                            required
                            placeholder="Kata kunci filter..."
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded p-1.5 text-xs font-semibold focus:outline-none"
                          />
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                          <button
                            type="button"
                            onClick={() => setShowFilterDropdown(false)}
                            className="px-2.5 py-1 text-slate-450 hover:text-slate-650 font-semibold"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-[#1D4ED8] text-white rounded font-bold hover:bg-blue-700"
                          >
                            Terapkan
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                {/* Reset Filters action */}
                {(search || activeFilters.length > 0 || sortField !== 'id') && (
                  <button
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:underline"
                  >
                    <XCircle className="h-4 w-4" /> Reset Filter
                  </button>
                )}
              </div>

              {/* Active filters pill list */}
              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-slate-50 dark:border-slate-850 pt-3">
                  {activeFilters.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/5 text-[#1D4ED8] border border-blue-500/10 px-2 py-0.5 rounded-full"
                    >
                      {f.field}: "{f.value}"
                      <button onClick={() => handleRemoveFilter(idx)} className="hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Records Data Sheet Grid */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden min-h-[350px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
                <span className="text-xs text-slate-400 font-bold">Mengambil data dari database...</span>
              </div>
            ) : !selectedTable ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Database className="h-10 w-10 text-slate-300" />
                <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350">Tidak ada tabel aktif</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px]">
                  Silakan integrasikan berkas spreadsheet di menu Integrasi Data untuk membuat tabel baru.
                </p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
                <XCircle className="h-10 w-10 text-slate-300" />
                <h3 className="font-extrabold text-sm text-slate-700 dark:text-slate-350">Data tidak ditemukan</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px]">
                  Tidak ada baris yang cocok dengan kata kunci pencarian atau filter yang diterapkan.
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="overflow-x-auto min-w-full">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400 sticky top-0">
                      <tr>
                        {columns.map((c) => (
                          <th
                            key={c.name}
                            onClick={() => handleSort(c.name)}
                            className="px-4 py-3.5 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 select-none whitespace-nowrap min-w-[120px] max-w-[220px]"
                          >
                            <span className="flex items-center gap-1">
                              {c.name}
                              {sortField === c.name && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                              <span className="text-[9px] font-mono font-normal opacity-50 lowercase">({c.type})</span>
                            </span>
                          </th>
                        ))}
                        <th className="px-4 py-3.5 text-center w-24 bg-slate-50 dark:bg-slate-900">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {records.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          {columns.map((c) => {
                            let cellVal = row[c.name];
                            
                            // Format representations
                            if (c.type === 'date' && cellVal) {
                              cellVal = new Date(cellVal).toLocaleDateString();
                            } else if (c.type === 'boolean') {
                              cellVal = cellVal ? 'Ya' : 'Tidak';
                            } else if (c.type === 'number' && cellVal !== null && cellVal !== undefined) {
                              cellVal = Number(cellVal).toLocaleString();
                            }
                            
                            return (
                              <td key={c.name} className="px-4 py-2.5 truncate max-w-[220px]" title={String(row[c.name] || '')}>
                                {cellVal === null || cellVal === undefined ? '' : String(cellVal)}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openEditModal(row)}
                                className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                                title="Ubah baris"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(row.id)}
                                className="p-1 rounded text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Hapus baris"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <span className="text-[11px] text-slate-550 dark:text-slate-400 font-bold">
                    Menampilkan {Math.min(totalRecords, (page - 1) * limit + 1)} sampai {Math.min(totalRecords, page * limit)} dari {totalRecords.toLocaleString()} baris
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-1">
                      Halaman {page} dari {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add/Edit Modal (Dynamic Form Fields based on column metadata schema) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="h-4.5 w-4.5 text-[#1D4ED8]" />
                {isEditMode ? `Ubah Data (ID: ${formRecord.id})` : 'Tambah Baris Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dynamic Form fields list */}
            <form onSubmit={handleSaveForm} className="overflow-y-auto flex-1 p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {columns
                  .filter(c => c.name !== 'id') // Exclude autoincrement ID primary key
                  .map((col) => {
                    const isRequired = !col.isNullable;
                    return (
                      <div key={col.name} className={`space-y-1.5 ${col.name === 'rekomendasi' || col.name === 'description' ? 'md:col-span-2' : ''}`}>
                        <label className="text-xs font-extrabold text-slate-550 dark:text-slate-400 capitalize">
                          {col.name.replace(/_/g, ' ')} {isRequired && <span className="text-red-500">*</span>}
                        </label>
                        
                        {col.type === 'boolean' ? (
                          <select
                            required={isRequired}
                            value={formRecord[col.name] ? 'true' : 'false'}
                            onChange={(e) => setFormRecord({ ...formRecord, [col.name]: e.target.value === 'true' })}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                          >
                            <option value="true">Ya</option>
                            <option value="false">Tidak</option>
                          </select>
                        ) : col.name === 'rekomendasi' || col.name === 'description' ? (
                          <textarea
                            rows={3}
                            required={isRequired}
                            value={formRecord[col.name] || ''}
                            onChange={(e) => setFormRecord({ ...formRecord, [col.name]: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                          />
                        ) : (
                          <input
                            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                            step={col.type === 'number' ? 'any' : undefined}
                            required={isRequired}
                            value={formRecord[col.name] === null || formRecord[col.name] === undefined ? '' : formRecord[col.name]}
                            onChange={(e) => setFormRecord({ ...formRecord, [col.name]: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none"
                          />
                        )}
                      </div>
                    );
                  })
                }
              </div>

              {/* Form submit actions */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  {formLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Simpan Baris
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
