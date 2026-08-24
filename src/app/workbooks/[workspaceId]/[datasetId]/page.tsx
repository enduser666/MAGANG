'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDb } from '@/providers/DbContext';
import { DynamicDatasetTable } from '@/frontend/components/datasets/DynamicDatasetTable';
import { DatasetPagination } from '@/frontend/components/datasets/DatasetPagination';
import { DatasetLoadingState, DatasetEmptyState, DatasetErrorState } from '@/frontend/components/datasets/DatasetStates';
import { DatasetFormModal } from '@/frontend/components/datasets/DatasetFormModal';
import { DatasetDeleteDialog } from '@/frontend/components/datasets/DatasetDeleteDialog';
import { Search, Plus } from 'lucide-react';

export default function DynamicDatasetPage({ params }: { params: Promise<{ workspaceId: string, datasetId: string }> }) {
  const resolvedParams = use(params);
  const { workspaceId, datasetId } = resolvedParams;
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getHeaders } = useDb();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string, code?: number } | null>(null);
  
  const [datasetName, setDatasetName] = useState<string>(datasetId);
  const [columns, setColumns] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  
  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'update'>('create');
  const [formInitialData, setFormInitialData] = useState<any>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  
  // Pagination State
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Sorting & Search State
  const sortField = searchParams.get('sortField') || undefined;
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const searchQuery = searchParams.get('search') || '';
  
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const fetchDataset = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (sortField) queryParams.append('sortField', sortField);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);
      if (searchQuery) queryParams.append('search', searchQuery);

      const res = await fetch(`/api/workbooks/${workspaceId}/${datasetId}?${queryParams.toString()}`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError({ 
          message: data.message || 'Gagal memuat dataset.',
          code: res.status
        });
        return;
      }

      // Read from standardized ApiResponse shape
      const fetchedRecords = Array.isArray(data.data) ? data.data : [];
      const fetchedMetadata = data.meta?.metadata || {};
      const fetchedPagination = data.meta?.pagination || {};

      setRecords(fetchedRecords);
      setColumns(fetchedMetadata.columns || []);
      setDatasetName(fetchedMetadata.name || datasetId);
      setUserPermissions(data.meta?.userPermissions || []);
      
      setTotalPages(fetchedPagination.totalPages || 1);
      setTotalRecords(fetchedPagination.totalRecords || 0);

    } catch (err: any) {
      setError({ message: err.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, datasetId, page, limit, sortField, sortOrder, searchQuery, getHeaders]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset]);

  const updateURL = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    router.push(`/workbooks/${workspaceId}/${datasetId}?${newParams.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage.toString() });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      updateURL({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: '1' });
    } else {
      updateURL({ sortField: field, sortOrder: 'asc', page: '1' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ search: localSearch, page: '1' });
  };

  const handleCreateClick = () => {
    setFormMode('create');
    setFormInitialData(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (record: any) => {
    setFormMode('update');
    setFormInitialData(record);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: any) => {
    setRecordToDelete(record);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    const method = formMode === 'create' ? 'POST' : 'PUT';
    const url = formMode === 'create' 
      ? `/api/workbooks/${workspaceId}/${datasetId}` 
      : `/api/workbooks/${workspaceId}/${datasetId}/${values.id}`;

    const res = await fetch(url, {
      method,
      headers: {
        ...getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Terjadi kesalahan saat menyimpan data.');
    }
    
    fetchDataset();
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    const res = await fetch(`/api/workbooks/${workspaceId}/${datasetId}/${recordToDelete.id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Terjadi kesalahan saat menghapus data.');
    }
    
    fetchDataset();
  };

  const canCreate = userPermissions.includes('CREATE');
  const canUpdate = userPermissions.includes('UPDATE');
  const canDelete = userPermissions.includes('DELETE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {datasetName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Menampilkan data dari dataset <span className="font-mono text-xs">{datasetId}</span>
          </p>
        </div>
        {canCreate && (
          <button
            onClick={handleCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari data..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent dark:text-white"
          />
        </form>
      </div>

      {/* Main Content */}
      <div className="relative min-h-[400px]">
        {loading ? (
          <DatasetLoadingState />
        ) : error ? (
          <DatasetErrorState title={error.code === 404 ? 'Dataset Tidak Ditemukan' : 'Gagal Memuat Data'} message={error.message} code={error.code} />
        ) : records.length === 0 ? (
          <DatasetEmptyState title="Data Kosong" message={searchQuery ? `Tidak ada hasil pencarian untuk "${searchQuery}".` : 'Belum ada data pada dataset ini.'} />
        ) : (
          <div className="flex flex-col shadow-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <DynamicDatasetTable 
              columns={columns} 
              records={records}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              onEdit={canUpdate ? handleEditClick : undefined}
              onDelete={canDelete ? handleDeleteClick : undefined}
            />
            <DatasetPagination 
              currentPage={page}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <DatasetFormModal
        isOpen={isFormOpen}
        mode={formMode}
        datasetName={datasetName}
        columns={columns}
        initialData={formInitialData}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <DatasetDeleteDialog
        isOpen={isDeleteOpen}
        datasetName={datasetName}
        recordIdentifier={`ID: ${recordToDelete?.id || 'Unknown'}`}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
