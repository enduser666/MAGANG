'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDb } from '@/providers/DbContext';
import {
  Database, RefreshCw, AlertTriangle, CheckCircle, 
  Settings, ArrowRight, Layers, LayoutDashboard, Search,
  Play, Save, CheckSquare
} from 'lucide-react';

interface Dataset {
  id: string;
  dataset_name: string;
  dataset_mode: string;
  table_name: string;
  row_count: number;
  status: string;
  is_active: number;
  imported_by: string;
  imported_at: string;
  activated_by: string;
  activated_at: string;
  version: number;
  column_mapping: any;
}

export default function DatasetManagementPage() {
  const router = useRouter();
  const { getHeaders } = useDb();

  const [user, setUser] = useState<any>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  // Configuration Modal states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [columns, setColumns] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any>({});
  
  const [unitValidation, setUnitValidation] = useState<any>(null);
  const [statusValues, setStatusValues] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load datasets
  const loadDatasets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/datasets', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setDatasets(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { headers: getHeaders() });
        const data = await res.json();
        if (data.success && data.data) {
          const u = data.data;
          if (u.role !== 'ADMIN_PUSAT') {
            router.push('/');
          } else {
            setUser(u);
            loadDatasets();
          }
        } else {
          router.push('/');
        }
      } catch (e) {
        router.push('/');
      }
    };
    fetchAuth();
  }, [getHeaders, router, loadDatasets]);

  const openConfig = async (ds: Dataset) => {
    setSelectedDataset(ds);
    setIsConfigOpen(true);
    setConfigLoading(true);
    setMapping(ds.column_mapping ? (typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping) : {});
    setPreviewData(null);
    setUnitValidation(null);
    
    try {
      const res = await fetch(`/api/datasets/${ds.id}/columns`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setColumns(data.data || []);
        
        // Auto-suggest mapping logic if mapping is empty
        const initialMapping = ds.column_mapping ? (typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping) : {};
        if (Object.keys(initialMapping).length === 0) {
            const cols = data.data as any[];
            const suggestion: any = {};
            
            const findCol = (keywords: string[]) => {
               return cols.find(c => keywords.some(kw => c.name.toLowerCase().includes(kw)))?.name;
            };

            const lhpCol = findCol(['lhp']);
            if (lhpCol) suggestion.lhp = { column: lhpCol, aggregation: 'COUNT_DISTINCT' };

            const temuanCol = findCol(['temuan']);
            if (temuanCol) suggestion.finding = { column: temuanCol, aggregation: 'COUNT_DISTINCT' };

            const rekCol = findCol(['rekomendasi', 'rek']);
            if (rekCol) suggestion.recommendation = { column: rekCol, aggregation: 'COUNT_DISTINCT' };

            const nilaiCol = findCol(['nilai']);
            if (nilaiCol) suggestion.recommendation_value = { column: nilaiCol, aggregation: 'SUM' };

            const statusCol = findCol(['status']);
            if (statusCol) suggestion.status = { column: statusCol, completed_values: [] };

            const unitCol = findCol(['uic', 'unit']);
            if (unitCol) suggestion.unit = { column: unitCol };
            
            const jenisCol = findCol(['jenis']);
            if (jenisCol) suggestion.finding_type = { column: jenisCol };

            const periodCol = findCol(['tanggal', 'periode', 'tahun']);
            if (periodCol) suggestion.period = { column: periodCol };

            setMapping(suggestion);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfigLoading(false);
    }
  };

  const handleMappingChange = (field: string, colName: string) => {
    setMapping((prev: any) => {
      const newMapping = { ...prev };
      if (!colName) {
         delete newMapping[field];
      } else {
         newMapping[field] = { ...(prev[field] || {}) };
         newMapping[field].column = colName;
         if (field === 'lhp' || field === 'finding' || field === 'recommendation') {
             newMapping[field].aggregation = 'COUNT_DISTINCT';
         }
         if (field === 'recommendation_value') {
             newMapping[field].aggregation = 'SUM';
         }
      }
      return newMapping;
    });
  };

  const validateUnit = async () => {
    if (!mapping.unit?.column) return;
    try {
      const res = await fetch(`/api/datasets/${selectedDataset?.id}/distinct?column=${encodeURIComponent(mapping.unit.column)}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
         const distinctVals = data.data.values;
         const resSys = await fetch('/api/units', { headers: getHeaders() });
         const sysData = await resSys.json();
         const validCodes = (sysData.data || []).map((u: any) => u.kode_unit);

         const validCodesLower = validCodes.map((v: string) => v.trim().toLowerCase());

         let matched = 0;
         const mismatched: string[] = [];
         const ignored: string[] = [];
         
         distinctVals.forEach((val: string) => {
             const cleanVal = val ? val.toString().trim() : '';
             if (cleanVal) {
                const lowerVal = cleanVal.toLowerCase();
                const excludedUnits = ['k/l lain', 'kl lain'];
                
                if (excludedUnits.includes(lowerVal)) {
                    ignored.push(val);
                } else if (validCodesLower.includes(lowerVal)) {
                    matched++;
                } else {
                    mismatched.push(val);
                }
             }
         });

         setUnitValidation({
             total: data.data.totalDistinct,
             nullCount: data.data.nullCount,
             matched,
             mismatched,
             ignored
         });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStatusValues = async () => {
    if (!mapping.status?.column) return;
    try {
      const res = await fetch(`/api/datasets/${selectedDataset?.id}/distinct?column=${encodeURIComponent(mapping.status.column)}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
         setStatusValues(data.data.values || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleStatusCompletedValue = (val: string) => {
    setMapping((prev: any) => {
      const newMap = { ...prev };
      newMap.status = { ...prev.status };
      newMap.status.completed_values = [...(prev.status?.completed_values || [])];
      
      const idx = newMap.status.completed_values.indexOf(val);
      if (idx > -1) {
         newMap.status.completed_values.splice(idx, 1);
      } else {
         newMap.status.completed_values.push(val);
      }
      return newMap;
    });
  };

  const saveMapping = async () => {
    try {
      const res = await fetch(`/api/datasets/${selectedDataset?.id}/mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ columnMapping: mapping })
      });
      const data = await res.json();
      if (data.success) {
        alert('Mapping berhasil disimpan');
        loadDatasets();
      } else {
        alert('Gagal menyimpan: ' + data.message);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const previewDashboard = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/datasets/${selectedDataset?.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ columnMapping: mapping })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data.data);
      } else {
        alert('Gagal membuat preview: ' + data.message);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const activateDataset = async () => {
    if (!confirm(`Aktifkan Dataset Ini?\n\nDataset ini akan menjadi sumber data utama Dashboard SIDATA.\n\nDataset aktif sebelumnya akan dinonaktifkan, tetapi tidak dihapus dan dapat diaktifkan kembali.\n\nLanjutkan?`)) {
       return;
    }

    try {
      const res = await fetch(`/api/datasets/${selectedDataset?.id}/activate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ columnMapping: mapping })
      });
      const data = await res.json();
      if (data.success) {
        alert('Dataset berhasil diaktifkan!');
        setIsConfigOpen(false);
        loadDatasets();
      } else {
        alert('Gagal mengaktifkan dataset: ' + data.message);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  if (!user || user.role !== 'ADMIN_PUSAT') {
    return null; // or loading/redirect
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
            Configuration
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight font-sans">Manajemen Dataset</h1>
        </div>
        <button
          onClick={loadDatasets}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-50 px-4 py-2 text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {datasets.map((ds) => (
           <div key={ds.id} className={`rounded-xl border p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-sm ${ds.is_active ? 'border-[#1D4ED8] bg-blue-50/30 dark:bg-blue-900/10 shadow-blue-500/5' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827]'}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 dark:text-white">{ds.dataset_name}</h3>
                  {ds.is_active === 1 && (
                     <span className="inline-flex items-center gap-1 rounded bg-[#1D4ED8] px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                       <CheckCircle className="h-3 w-3" /> ACTIVE
                     </span>
                  )}
                  {ds.is_active === 0 && ds.status === 'READY' && (
                     <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                       READY
                     </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <p>Tabel Fisik: <span className="font-mono">{ds.table_name}</span></p>
                  <p>Jumlah Baris: {ds.row_count?.toLocaleString()}</p>
                  <p>Diimpor oleh: {ds.imported_by} ({new Date(ds.imported_at).toLocaleString()})</p>
                </div>
              </div>
              
              <button
                onClick={() => openConfig(ds)}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all cursor-pointer"
              >
                <Settings className="h-4 w-4" /> Konfigurasi Mapping
              </button>
           </div>
        ))}
        {datasets.length === 0 && !loading && (
          <div className="text-center py-10 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-500 text-sm">
            Tidak ada dataset yang ditemukan.
          </div>
        )}
      </div>

      {/* Config Modal / Section */}
      {isConfigOpen && selectedDataset && (
         <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                     <Layers className="h-5 w-5 text-[#1D4ED8]" /> Konfigurasi Column Mapping: {selectedDataset.dataset_name}
                  </h2>
                  <button onClick={() => setIsConfigOpen(false)} className="text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 p-1.5 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto flex-1 space-y-8">
                 {configLoading ? (
                    <div className="flex justify-center p-10"><RefreshCw className="h-8 w-8 animate-spin text-slate-400" /></div>
                 ) : (
                    <>
                      {/* Mapping Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         
                         {/* LHP, Temuan, Rekomendasi, Nilai */}
                         <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metrics Utama</h3>
                            
                            {['lhp', 'finding', 'recommendation', 'recommendation_value'].map((field) => (
                               <div key={field}>
                                 <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 capitalize">{field.replace('_', ' ')}</label>
                                 <select 
                                   value={mapping[field]?.column || ''} 
                                   onChange={(e) => handleMappingChange(field, e.target.value)}
                                   className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                                 >
                                    <option value="">-- Pilih Kolom (Kosongkan jika tidak ada) --</option>
                                    {columns.map(c => (
                                       <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                 </select>
                               </div>
                            ))}
                         </div>
                         
                         {/* Unit, Status, Periode, Jenis */}
                         <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dimensi & Akses</h3>
                            
                            <div>
                               <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Unit Access Control (Wajib jika Dataset digunakan Admin Unit)</label>
                               <div className="flex gap-2">
                                 <select 
                                   value={mapping['unit']?.column || ''} 
                                   onChange={(e) => handleMappingChange('unit', e.target.value)}
                                   className="flex-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                                 >
                                    <option value="">-- Pilih Kolom Unit --</option>
                                    {columns.map(c => (
                                       <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                 </select>
                                 <button onClick={validateUnit} disabled={!mapping['unit']?.column} className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                                   Validasi
                                 </button>
                               </div>
                               
                               {unitValidation && (
                                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-1">
                                     <p>Jumlah Nilai Unik: <b>{unitValidation.total}</b></p>
                                     <p>Nilai Kosong (NULL): <b>{unitValidation.nullCount}</b></p>
                                     <p className="text-emerald-600 font-bold">Cocok dengan sys_units: {unitValidation.matched}</p>
                                     <p className="text-red-500 font-bold">Tidak Cocok: {unitValidation.mismatched.length}</p>
                                     {unitValidation.mismatched.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
                                           <span className="font-bold text-slate-500">Nilai tidak terdaftar:</span>
                                           <p className="font-mono text-red-500 text-[10px]">{unitValidation.mismatched.join(', ')}</p>
                                        </div>
                                     )}
                                     {unitValidation.ignored && unitValidation.ignored.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
                                           <span className="font-bold text-slate-500">Dikecualikan (Ambigu):</span>
                                           <p className="font-mono text-amber-500 text-[10px]">{unitValidation.ignored.join(', ')}</p>
                                        </div>
                                     )}
                                  </div>
                               )}
                            </div>

                            <div>
                               <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                               <div className="flex gap-2">
                                 <select 
                                   value={mapping['status']?.column || ''} 
                                   onChange={(e) => handleMappingChange('status', e.target.value)}
                                   className="flex-1 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                                 >
                                    <option value="">-- Pilih Kolom Status --</option>
                                    {columns.map(c => (
                                       <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                 </select>
                                 <button onClick={fetchStatusValues} disabled={!mapping['status']?.column} className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                                   Load Nilai
                                 </button>
                               </div>
                               
                               {statusValues.length > 0 && (
                                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs space-y-2">
                                     <p className="font-bold text-slate-500">Pilih nilai yang dianggap Selesai (Closed):</p>
                                     <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                        {statusValues.map(val => (
                                           <label key={val} className="flex items-center gap-2 cursor-pointer">
                                              <input 
                                                type="checkbox" 
                                                checked={(mapping['status']?.completed_values || []).includes(val)}
                                                onChange={() => toggleStatusCompletedValue(val)}
                                                className="accent-[#1D4ED8]"
                                              />
                                              <span className="truncate" title={val}>{val}</span>
                                           </label>
                                        ))}
                                     </div>
                                  </div>
                               )}
                            </div>
                            
                            {['finding_type', 'period'].map((field) => (
                               <div key={field}>
                                 <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 capitalize">{field.replace('_', ' ')}</label>
                                 <select 
                                   value={mapping[field]?.column || ''} 
                                   onChange={(e) => handleMappingChange(field, e.target.value)}
                                   className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs focus:outline-none"
                                 >
                                    <option value="">-- Pilih Kolom (Opsional) --</option>
                                    {columns.map(c => (
                                       <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                 </select>
                               </div>
                            ))}
                         </div>
                         
                      </div>

                      <div className="flex items-center gap-3 border-t border-b border-slate-200 dark:border-slate-800 py-4">
                         <button onClick={saveMapping} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all">
                            <Save className="h-4 w-4" /> Simpan Konfigurasi
                         </button>
                         <button onClick={previewDashboard} disabled={previewLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-blue-500/20 disabled:opacity-50">
                            {previewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LayoutDashboard className="h-4 w-4" />} Preview Dashboard
                         </button>
                      </div>

                      {/* Dashboard Preview Result */}
                      {previewData && (
                         <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                               <CheckSquare className="h-4 w-4 text-[#1D4ED8]" /> Hasil Pratinjau Sementara
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Total LHP</span>
                                  <span className="block text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{previewData.totalLhp !== null ? previewData.totalLhp.toLocaleString() : '—'}</span>
                               </div>
                               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Temuan</span>
                                  <span className="block text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{previewData.totalRecords !== null ? previewData.totalRecords.toLocaleString() : '—'}</span>
                               </div>
                               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Nilai Rekomendasi</span>
                                  <span className="block text-xl font-black text-amber-600 mt-1">
                                    {previewData.totalRekomendasiNilai !== null 
                                      ? previewData.totalRekomendasiNilai >= 1e12 
                                        ? 'Rp ' + (previewData.totalRekomendasiNilai / 1e12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' T'
                                        : previewData.totalRekomendasiNilai >= 1e9
                                          ? 'Rp ' + (previewData.totalRekomendasiNilai / 1e9).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' M'
                                          : previewData.totalRekomendasiNilai >= 1e6
                                            ? 'Rp ' + (previewData.totalRekomendasiNilai / 1e6).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' Jt'
                                            : 'Rp ' + previewData.totalRekomendasiNilai.toLocaleString()
                                      : '—'}
                                  </span>
                               </div>
                               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm">
                                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Selesai (Status)</span>
                                  <span className="block text-xl font-black text-emerald-600 mt-1">{previewData.statusSummary?.tuntas?.toLocaleString() ?? '—'}</span>
                               </div>
                            </div>
                         </div>
                      )}
                    </>
                 )}
               </div>
               
               <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                  <button onClick={() => setIsConfigOpen(false)} className="px-4 py-2 bg-transparent text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
                    Tutup
                  </button>
                  <button onClick={activateDataset} disabled={configLoading} className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50">
                    Jadikan Dataset Aktif <ArrowRight className="h-4 w-4" />
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
