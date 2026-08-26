'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/providers/DbContext';
import {
  History,
  Search,
  Download,
  Calendar,
  User,
  Filter,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  Database,
  RotateCcw,
  Check,
  FileCheck2
} from 'lucide-react';

// Seeded Data Changes Mock Database (from old riwayat)
const INITIAL_CHANGES = [
  {
    id: 'CHG-001',
    tabel: 'Oversight_Findings_2026',
    barisId: 105,
    field: 'Status',
    oldValue: 'Belum Selesai',
    newValue: 'Selesai',
    user: 'ahmad_jaelani',
    timestamp: '2026-06-25 10:15:30',
    restored: false
  },
  {
    id: 'CHG-002',
    tabel: 'Tax_Revenue_FY26_Plan',
    barisId: 12,
    field: 'Target_Penerimaan',
    oldValue: '1200000000000000', // Rp1.200 Triliun
    newValue: '1450000000000000', // Rp1.450 Triliun
    user: 'budi_waseso',
    timestamp: '2026-06-25 09:04:12',
    restored: false
  },
  {
    id: 'CHG-003',
    tabel: 'BMN_Aset_Kaltim',
    barisId: 88,
    field: 'Status_Sertifikasi',
    oldValue: 'Belum Bersertifikat',
    newValue: 'Sertifikat Terbit (Kemenkeu)',
    user: 'siti_supeni',
    timestamp: '2026-06-24 16:30:45',
    restored: false
  },
  {
    id: 'CHG-004',
    tabel: 'Budget_Allocation_Setjen',
    barisId: 44,
    field: 'Alokasi_Dana_Diklat',
    oldValue: '45000000000', // Rp45 Miliar
    newValue: '38000000000', // Rp38 Miliar
    user: 'admin',
    timestamp: '2026-06-23 11:15:02',
    restored: false
  },
  {
    id: 'CHG-005',
    tabel: 'Pipeline_Ingestion_Logs',
    barisId: 3042,
    field: 'Status_Sync',
    oldValue: 'FAILED',
    newValue: 'SUCCESS',
    user: 'system_daemon',
    timestamp: '2026-06-25 07:05:00',
    restored: false
  }
];

export default function UnifiedAuditLogs() {
  const { dbType, getHeaders, connectionStatus } = useDb();
  const [activeTab, setActiveTab] = useState<'system' | 'changes'>('system');

  // --- TAB: SYSTEM AUDIT LOGS STATE ---
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [systemSearch, setSystemSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [timeRange, setTimeRange] = useState('7');

  // --- TAB: DATA CHANGES LOGS STATE ---
  const [changes, setChanges] = useState(INITIAL_CHANGES);
  const [changesSearch, setChangesSearch] = useState('');
  const [selectedChangeTable, setSelectedChangeTable] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/history', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        const rawLogs = data.logs || [];
        setLogs(rawLogs);

        // Process data changes log dynamically from log history snapshots
        const processedChanges: any[] = [];
        rawLogs.forEach((log: any) => {
          if (log.action === 'Record Updated' && log.details.includes('Snapshot:')) {
            try {
              const snapshotIndex = log.details.indexOf('Snapshot:');
              const jsonStr = log.details.substring(snapshotIndex + 9).trim();
              const snapshot = JSON.parse(jsonStr);
              
              const { tableName, recordId, oldValue, newValue } = snapshot;
              
              const changedKeys = Object.keys(newValue).filter(k => 
                k !== 'id' && JSON.stringify(oldValue[k]) !== JSON.stringify(newValue[k])
              );
              
              changedKeys.forEach((key, idx) => {
                processedChanges.push({
                  id: `CHG-${log.id}-${idx}`,
                  tabel: tableName,
                  barisId: recordId,
                  field: key,
                  oldValue: String(oldValue[key] ?? ''),
                  newValue: String(newValue[key] ?? ''),
                  user: log.user || 'Data Analyst',
                  timestamp: new Date(log.timestamp).toISOString().slice(0, 19).replace('T', ' '),
                  restored: false,
                  fullOldRecord: oldValue,
                  logId: log.id
                });
              });
            } catch (err) {
              console.error('Failed to parse changes log snapshot JSON:', err);
            }
          }
        });
        
        setChanges(processedChanges.length > 0 ? processedChanges : INITIAL_CHANGES);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, dbType, connectionStatus]);

  const handleExportCsv = () => {
    if (logs.length === 0) return;
    try {
      const csvKeys = ['timestamp', 'user', 'action', 'details', 'ipAddress', 'status'];
      const csvHeaderLine = csvKeys.map(k => `"${k.toUpperCase()}"`).join(',');
      
      const csvRows = logs.map((row) => {
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
      link.setAttribute('download', `audit_trail_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert('Gagal ekspor CSV: ' + e.message);
    }
  };

  // Filter system logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.action.toLowerCase().includes(systemSearch.toLowerCase()) || 
                          log.details.toLowerCase().includes(systemSearch.toLowerCase()) ||
                          log.user.toLowerCase().includes(systemSearch.toLowerCase());
    
    const matchesUser = selectedUser === 'all' || log.user.toLowerCase().includes(selectedUser.toLowerCase());
    const matchesAction = selectedAction === 'all' || log.action.toLowerCase().includes(selectedAction.toLowerCase());

    return matchesSearch && matchesUser && matchesAction;
  });

  // Filter data changes logs
  const filteredChanges = changes.filter(c => {
    const matchesSearch = c.tabel.toLowerCase().includes(changesSearch.toLowerCase()) ||
      c.field.toLowerCase().includes(changesSearch.toLowerCase()) ||
      c.user.toLowerCase().includes(changesSearch.toLowerCase());
    const matchesTable = selectedChangeTable ? c.tabel === selectedChangeTable : true;
    return matchesSearch && matchesTable;
  });

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Rollback action handler
  const handleRollback = async (chg: any) => {
    if (!confirm(`Apakah Anda yakin ingin memulihkan field "${chg.field}" pada tabel "${chg.tabel}" (Baris ID: ${chg.barisId}) kembali ke nilai "${chg.oldValue}"?`)) {
      return;
    }

    try {
      const headers = getHeaders();
      const valToRestore = chg.field === 'dampak_finansial' || chg.field === 'id' || chg.field === 'progress' 
        ? Number(chg.oldValue) 
        : chg.oldValue;
        
      const res = await fetch(`/api/tables/${chg.tabel}/${chg.barisId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ [chg.field]: valToRestore })
      });
      const resData = await res.json();
      if (resData.success) {
        setChanges(prev => prev.map(c => c.id === chg.id ? { ...c, restored: true } : c));
        showToast(`Nilai baris data berhasil dikembalikan ke: ${chg.oldValue}!`, 'success');
        fetchLogs();
      } else {
        alert('Gagal rollback database: ' + resData.message);
      }
    } catch (e: any) {
      alert('Rollback error: ' + e.message);
    }
  };

  const formatVal = (val: string) => {
    if (val.length >= 10 && !isNaN(Number(val))) {
      return `Rp${(Number(val) / 1e12).toLocaleString()} Triliun`;
    }
    return val;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Page Title & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
            Auditability & Compliance
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-[#1D4ED8]" /> Log Audit Pengawasan
          </h1>
        </div>

        {activeTab === 'system' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchLogs}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-550 hover:bg-slate-50 cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-bold hover:bg-slate-55 cursor-pointer text-slate-500"
            >
              <Download className="h-4 w-4" /> Ekspor CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-bold text-slate-550">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'system'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" /> Log Aktivitas Sistem
        </button>
        <button
          onClick={() => setActiveTab('changes')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'changes'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4" /> Riwayat Perubahan Data
        </button>
      </div>

      {/* --- TAB CONTENT: SYSTEM AUDIT TRAIL LOGS --- */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3.5 flex-1 min-w-[280px]">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari log aktivitas..."
                  value={systemSearch}
                  onChange={(e) => setSystemSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-4 py-2 text-xs focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Pengguna</option>
                <option value="admin">Rina S. (Admin)</option>
                <option value="analyst">Budi P. (Analyst)</option>
                <option value="auditor">Dwi K. (Auditor)</option>
                <option value="system">SYSTEM (Daemon)</option>
              </select>

              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Tindakan</option>
                <option value="upload">Dataset Upload</option>
                <option value="query">Query Executed</option>
                <option value="modified">Record Modified</option>
                <option value="access">Unauthorized Access</option>
              </select>

              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="7">7 Hari Terakhir</option>
                <option value="30">30 Hari Terakhir</option>
                <option value="365">1 Tahun Terakhir</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden min-h-[300px]">
            {logsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111827]">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-400 mb-2" />
                <span className="text-xs font-bold text-slate-400">Memuat log audit...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-405 italic text-xs">Tidak ada log aktivitas sistem yang cocok.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 text-left w-44">Timestamp</th>
                      <th className="px-4 py-3.5 text-left w-36">User</th>
                      <th className="px-4 py-3.5 text-left w-48">Tindakan</th>
                      <th className="px-4 py-3.5 text-left">Objek / Detail Target</th>
                      <th className="px-4 py-3.5 text-left w-32">IP Address</th>
                      <th className="px-4 py-3.5 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-350">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-400 font-mono">
                          {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                        </td>
                        <td className="px-4 py-3 font-semibold">{log.user}</td>
                        <td className="px-4 py-3 font-semibold">{log.action}</td>
                        <td className="px-4 py-3 truncate max-w-xs" title={log.details}>{log.details}</td>
                        <td className="px-4 py-3 font-mono text-slate-405">{log.ipAddress || '127.0.0.1'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold border ${
                            log.status === 'SUCCESS' || log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-500/10'
                              : 'bg-red-100 text-red-800 border-red-500/10'
                          }`}>{log.status || 'SUCCESS'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: DATA CHANGE LOGS & ROLLBACK --- */}
      {activeTab === 'changes' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative font-semibold text-xs flex-1 max-w-md">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-450" />
              <input
                type="text"
                placeholder="Cari perubahan berdasarkan tabel, field, atau user..."
                value={changesSearch}
                onChange={(e) => setChangesSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="w-full sm:w-56 font-semibold text-xs flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#1D4ED8]" />
              <select
                value={selectedChangeTable}
                onChange={(e) => setSelectedChangeTable(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none cursor-pointer"
              >
                <option value="">Semua Tabel Data</option>
                <option value="Oversight_Findings_2026">Oversight_Findings_2026</option>
                <option value="Tax_Revenue_FY26_Plan">Tax_Revenue_FY26_Plan</option>
                <option value="BMN_Aset_Kaltim">BMN_Aset_Kaltim</option>
                <option value="Budget_Allocation_Setjen">Budget_Allocation_Setjen</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredChanges.length === 0 ? (
              <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 italic text-xs font-semibold">
                Tidak ditemukan catatan riwayat perubahan data.
              </div>
            ) : (
              filteredChanges.map((chg) => (
                <div 
                  key={chg.id}
                  className={`bg-white dark:bg-[#111827] rounded-xl border p-5 shadow-xs flex flex-col lg:flex-row justify-between gap-4 font-semibold text-xs border-l-4 ${
                    chg.restored 
                      ? 'border-l-slate-350 opacity-70 bg-slate-50/50 dark:bg-slate-900/10' 
                      : chg.user.includes('Rollback')
                      ? 'border-l-emerald-500'
                      : 'border-l-blue-500'
                  }`}
                >
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="font-mono">{chg.id}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Database className="h-3.5 w-3.5" /> Tabel: {chg.tabel}</span>
                      <span className="bg-slate-100 dark:bg-slate-900 text-slate-550 px-1.5 py-0.5 rounded">Baris ID: {chg.barisId}</span>
                      <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> User: @{chg.user}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Waktu: {chg.timestamp}</span>
                    </div>

                    <h3 className="text-xs font-black text-slate-900 dark:text-white">
                      Modifikasi Field: <strong className="text-[#1D4ED8] font-mono">{chg.field}</strong>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 max-w-2xl font-bold">
                      <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                        <span className="text-[9px] text-red-500 uppercase tracking-widest block font-extrabold mb-1">Sebelum Perubahan (Before)</span>
                        <p className="text-xs text-red-650 dark:text-red-400 line-through truncate">{formatVal(chg.oldValue)}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                        <span className="text-[9px] text-emerald-600 uppercase tracking-widest block font-extrabold mb-1">Sesudah Perubahan (After)</span>
                        <p className="text-xs text-emerald-650 dark:text-emerald-400 truncate">{formatVal(chg.newValue)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 lg:self-center">
                    {chg.restored ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-450 italic">
                        <FileCheck2 className="h-4 w-4" /> Versi Dipulihkan
                      </span>
                    ) : chg.user.includes('Rollback') ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                        <Check className="h-4 w-4" /> Transaksi Rollback
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRollback(chg)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-[#111827] dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 px-3 py-2 font-bold transition-all shadow-xs cursor-pointer"
                        title="Kembalikan ke versi sebelum perubahan"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-blue-500" /> Pulihkan Versi
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Toast Notification element */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-in slide-in-from-bottom-5 bg-white/90 dark:bg-[#111827]/90 border-slate-200/50 dark:border-slate-800">
          <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600"><Check className="h-4 w-4" /></div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{toast.message}</span>
        </div>
      )}

    </div>
  );
}
