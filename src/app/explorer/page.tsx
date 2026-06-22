'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useDb } from '@/context/DbContext';
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
  Loader2
} from 'lucide-react';

interface Episode {
  id: number;
  season: number;
  title: string;
  summary: string;
  rating: number;
  votes: number;
  viewership: number;
  duration: number;
  releaseDate: string | null;
  guestStars: string | null;
  director: string;
  writers: string;
}

export default function DataExplorer() {
  const { dbType, getHeaders, connectionStatus } = useDb();

  // Data state
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [limit] = useState(20);

  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Partial<Episode>>({});
  const [editLoading, setEditLoading] = useState(false);
  
  // Create state (inline or modal form, let's use the same modal for simplicity)
  const [isCreateMode, setIsCreateMode] = useState(false);

  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortField,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (seasonFilter) params.append('season', seasonFilter);

      const res = await fetch(`/api/episodes?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.success) {
        setEpisodes(data.data || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalRecords(data.pagination.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch records:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, seasonFilter, sortField, sortOrder, getHeaders]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes, dbType, connectionStatus]);

  // Handle Search submit
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSeasonFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeasonFilter(e.target.value);
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

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSeasonFilter('');
    setSortField('id');
    setSortOrder('desc');
    setPage(1);
  };

  // Delete single record
  const handleDeleteRecord = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete episode "${title}"?`)) return;

    try {
      const headers = getHeaders();
      const res = await fetch(`/api/episodes/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        fetchEpisodes();
      } else {
        alert(data.message || 'Failed to delete record');
      }
    } catch (err: any) {
      alert('Error deleting record: ' + err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (ep: Episode) => {
    setIsCreateMode(false);
    // Format date for input field type="date" (YYYY-MM-DD)
    let formattedDate = '';
    if (ep.releaseDate) {
      const dateObj = new Date(ep.releaseDate);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toISOString().split('T')[0];
      }
    }

    setEditingEpisode({
      ...ep,
      releaseDate: formattedDate,
    });
    setIsEditModalOpen(true);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsCreateMode(true);
    setEditingEpisode({
      season: 1,
      title: '',
      summary: '',
      rating: 8.0,
      votes: 100,
      viewership: 5.0,
      duration: 22,
      releaseDate: new Date().toISOString().split('T')[0],
      guestStars: '',
      director: 'Unknown',
      writers: 'Unknown',
    });
    setIsEditModalOpen(true);
  };

  // Save Modal Form (handles PUT for edit and POST for create)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const headers = getHeaders();
      const method = isCreateMode ? 'POST' : 'PUT';
      const url = isCreateMode ? '/api/episodes' : `/api/episodes/${editingEpisode.id}`;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(editingEpisode),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchEpisodes();
      } else {
        alert(data.message || 'Failed to save record.');
      }
    } catch (err: any) {
      alert('Error occurred: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const headers = getHeaders();
      // Fetch all episodes without pagination for export
      const res = await fetch('/api/episodes?limit=5000', { headers });
      const data = await res.json();
      if (!data.success) {
        alert('Failed to retrieve records for export');
        return;
      }

      const list = data.data || [];
      if (list.length === 0) {
        alert('No records available to export.');
        return;
      }

      // Generate CSV string
      const csvKeys = ['season', 'title', 'rating', 'votes', 'viewership', 'duration', 'releaseDate', 'guestStars', 'director', 'writers', 'summary'];
      const csvHeadersStr = csvKeys.map(k => `"${k.toUpperCase()}"`).join(',');
      
      const csvRowsList = list.map((item: any) => {
        return csvKeys.map((key) => {
          let val = item[key];
          if (val === null || val === undefined) {
            val = '';
          } else if (key === 'releaseDate' && val) {
            val = new Date(val).toLocaleDateString();
          }
          // Escape double quotes inside values
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',');
      });

      const csvContent = [csvHeadersStr, ...csvRowsList].join('\n');
      
      // Trigger browser download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `data_migration_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Failed to export CSV: ' + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Management Explorer</h1>
          <p className="text-sm text-muted-foreground">Audit, search, edit, delete and export parsed records within active database schema.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Query Filter Toolbar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          
          {/* Filters Inputs */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search title, summary..."
                value={search}
                onChange={handleSearchChange}
                className="w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Season Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3" /> Season:
              </span>
              <select
                value={seasonFilter}
                onChange={handleSeasonFilterChange}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="">All Seasons</option>
                {Array.from({ length: 9 }).map((_, i) => (
                  <option key={i} value={String(i + 1)}>
                    Season {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Action */}
          {(search || seasonFilter || sortField !== 'id') && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            >
              <XCircle className="h-4 w-4" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Data Grid */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground font-medium">Querying database records...</span>
          </div>
        ) : episodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
            <XCircle className="h-10 w-10 text-muted-foreground/45" />
            <h3 className="font-bold text-base text-foreground">No records matched</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              No matching records found. Try modifying filters or upload database records in Data Import tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Table wrapper */}
            <div className="overflow-x-auto min-w-full">
              <table className="min-w-full divide-y divide-border text-xs">
                <thead className="bg-muted/50 font-bold text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left w-12 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('id')}>
                      ID {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-left w-16 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('season')}>
                      Season {sortField === 'season' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-left w-48 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('title')}>
                      Episode Title {sortField === 'title' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-center w-16 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('rating')}>
                      Rating {sortField === 'rating' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-right w-18 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('votes')}>
                      Votes {sortField === 'votes' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-right w-20 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('viewership')}>
                      Viewers {sortField === 'viewership' && (sortOrder === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="px-4 py-3 text-left w-24">Release Date</th>
                    <th className="px-4 py-3 text-left w-32">Director</th>
                    <th className="px-4 py-3 text-left w-48 truncate max-w-xs">Writers</th>
                    <th className="px-4 py-3 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card text-foreground">
                  {episodes.map((ep) => (
                    <tr key={ep.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono font-semibold text-muted-foreground">{ep.id}</td>
                      <td className="px-4 py-3 font-mono font-medium">S{ep.season}</td>
                      <td className="px-4 py-3 font-bold truncate max-w-[190px]" title={ep.title}>{ep.title}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          ★ {ep.rating}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{ep.votes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{ep.viewership}M</td>
                      <td className="px-4 py-3 truncate text-muted-foreground">
                        {ep.releaseDate ? new Date(ep.releaseDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-3 truncate max-w-[120px]" title={ep.director}>{ep.director}</td>
                      <td className="px-4 py-3 truncate max-w-[180px]" title={ep.writers}>{ep.writers}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(ep)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            title="Edit episode"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(ep.id, ep.title)}
                            className="p-1.5 rounded-lg border border-border text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-950/30 transition-all"
                            title="Delete episode"
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

            {/* Pagination Controls Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground font-semibold">
                Showing {Math.min(totalRecords, (page - 1) * limit + 1)} to {Math.min(totalRecords, page * limit)} of {totalRecords} records
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <span className="text-xs font-semibold text-foreground px-2">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit/Create Modal Overlay */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Scrim */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setIsEditModalOpen(false)} />
          
          {/* Modal content */}
          <div className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
              <h3 className="font-bold text-base text-foreground">
                {isCreateMode ? 'Add New Episode Record' : `Edit Episode (ID: ${editingEpisode.id})`}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleSaveForm} className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">Episode Title *</label>
                  <input
                    type="text"
                    required
                    value={editingEpisode.title || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Season */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Season *</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    required
                    value={editingEpisode.season || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, season: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Duration (Minutes) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingEpisode.duration || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, duration: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Rating */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Rating (0-10) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    required
                    value={editingEpisode.rating || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, rating: parseFloat(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Votes */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Votes *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={editingEpisode.votes || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, votes: parseInt(e.target.value, 10) }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Viewership */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Viewership (Millions) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingEpisode.viewership || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, viewership: parseFloat(e.target.value) }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Release Date</label>
                  <input
                    type="date"
                    value={editingEpisode.releaseDate || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, releaseDate: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Director */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Director *</label>
                  <input
                    type="text"
                    required
                    value={editingEpisode.director || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, director: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Writers */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Writers *</label>
                  <input
                    type="text"
                    required
                    value={editingEpisode.writers || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, writers: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Guest Stars */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">Guest Stars</label>
                  <input
                    type="text"
                    value={editingEpisode.guestStars || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, guestStars: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                {/* Summary */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground">Summary / About</label>
                  <textarea
                    rows={3}
                    value={editingEpisode.summary || ''}
                    onChange={(e) => setEditingEpisode(prev => ({ ...prev, summary: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="border-t border-border pt-4 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition-all shadow-sm"
                >
                  {editLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
