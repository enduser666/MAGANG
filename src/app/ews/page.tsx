'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Search,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Info,
  Clock,
  Check,
  ShieldAlert,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Seeded active warnings dataset
const INITIAL_ALERTS = [
  { id: 'EWS-01', unit: 'DJP', message: 'Temuan Risiko Tinggi meningkat sebesar 25% pada klaster kepatuhan pajak tahun berjalan.', severity: 'Critical', date: '2026-06-25 08:30', status: 'Aktif' },
  { id: 'EWS-02', unit: 'Itjen', message: 'Tingkat penyelesaian Tindak Lanjut Hasil Pengawasan (TLHP) menurun sebesar 10% di triwulan II.', severity: 'High', date: '2026-06-24 14:15', status: 'Aktif' },
  { id: 'EWS-03', unit: 'DJKN', message: 'Dataset registrasi aset negara "Land_Assets_Kaltim_2026" tidak diperbarui selama 14 hari terakhir.', severity: 'Medium', date: '2026-06-22 10:00', status: 'Aktif' },
  { id: 'EWS-04', unit: 'DJPb', message: 'Skor kualitas integritas data (Data Quality Score) regional Itjen turun di bawah batas aman 90% (88.4%).', severity: 'High', date: '2026-06-23 11:45', status: 'Aktif' },
  { id: 'EWS-05', unit: 'DJBC', message: 'Proses import data pipeline gagal secara beruntun pada dataset krusial penerimaan pelabuhan Tanjung Priok.', severity: 'Critical', date: '2026-06-25 07:05', status: 'Aktif' },
  { id: 'EWS-06', unit: 'BPPK', message: 'Keterlambatan audit kepatuhan program kurikulum diklat fungsional bendahara negara.', severity: 'Low', date: '2026-06-20 09:30', status: 'Aktif' },
  { id: 'EWS-07', unit: 'Setjen', message: 'Log audit internal mencatat adanya anomali akses IP address asing secara berulang pada basis data internal.', severity: 'High', date: '2026-06-24 18:22', status: 'Aktif' }
];

// Historical alerts count dataset for charts
const SEVERITY_DIST = [
  { name: 'Critical', value: 2, color: '#EF4444' },
  { name: 'High', value: 3, color: '#F97316' },
  { name: 'Medium', value: 1, color: '#F59E0B' },
  { name: 'Low', value: 1, color: '#3B82F6' }
];

const ALERT_TREND_DATA = [
  { week: 'W1', Critical: 1, High: 2, Medium: 3, Low: 4 },
  { week: 'W2', Critical: 2, High: 3, Medium: 2, Low: 3 },
  { week: 'W3', Critical: 1, High: 1, Medium: 4, Low: 5 },
  { week: 'W4', Critical: 2, High: 3, Medium: 1, Low: 1 }
];

export default function EarlyWarningSystem() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Filter alert list
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity ? alert.severity === selectedSeverity : true;
    const matchesUnit = selectedUnit ? alert.unit === selectedUnit : true;
    return matchesSearch && matchesSeverity && matchesUnit;
  });

  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Selesai' } : a));
    showToast(`Peringatan ${id} berhasil diverifikasi dan diselesaikan!`, 'success');
  };

  const activeAlertsCount = filteredAlerts.filter(a => a.status === 'Aktif').length;
  const criticalCount = filteredAlerts.filter(a => a.severity === 'Critical' && a.status === 'Aktif').length;
  const highCount = filteredAlerts.filter(a => a.severity === 'High' && a.status === 'Aktif').length;
  const medCount = filteredAlerts.filter(a => a.severity === 'Medium' && a.status === 'Aktif').length;
  const lowCount = filteredAlerts.filter(a => a.severity === 'Low' && a.status === 'Aktif').length;

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-rose-500" /> Early Warning System (EWS)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pusat pemantauan anomali, peringatan dini otomatis tingkat risiko temuan, dan kegagalan sync integrasi basis data pengawasan.
        </p>
      </div>

      {/* KPI Alert Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Active Alerts */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Peringatan Aktif</span>
            <Bell className="h-4.5 w-4.5 text-blue-500 animate-bounce" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{activeAlertsCount}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Butuh Tindakan Segera</span>
        </div>

        {/* Critical Level */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-950/20 bg-rose-500/5 dark:bg-rose-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-500 dark:text-rose-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Critical (Bahaya)</span>
            <AlertOctagon className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
          </div>
          <p className="text-xl font-black text-rose-900 dark:text-white mt-1">{criticalCount}</p>
          <span className="text-[9px] text-rose-600 font-bold block mt-1">Hentikan / Blokir</span>
        </div>

        {/* High Level */}
        <div className="rounded-xl border border-orange-200 dark:border-orange-950/20 bg-orange-500/5 dark:bg-orange-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-orange-500 dark:text-orange-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">High (Tinggi)</span>
            <ShieldAlert className="h-4.5 w-4.5 text-orange-500" />
          </div>
          <p className="text-xl font-black text-orange-900 dark:text-white mt-1">{highCount}</p>
          <span className="text-[9px] text-orange-600 font-bold block mt-1">Mitigasi Cepat</span>
        </div>

        {/* Medium Level */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-950/20 bg-amber-500/5 dark:bg-amber-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-500 dark:text-amber-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Medium (Sedang)</span>
            <Clock className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{medCount}</p>
          <span className="text-[9px] text-amber-600 font-bold block mt-1">Evaluasi Rutin</span>
        </div>

        {/* Low Level */}
        <div className="rounded-xl border border-blue-200 dark:border-blue-950/20 bg-blue-500/5 dark:bg-blue-500/5 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-500 dark:text-blue-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Low (Rendah)</span>
            <Info className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{lowCount}</p>
          <span className="text-[9px] text-blue-600 font-bold block mt-1">Catatan Pemantauan</span>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Severity Distribution Donut */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4">
            Distribusi Tingkat Keparahan Peringatan
          </h3>
          <div className="h-60 text-[10px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SEVERITY_DIST}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {SEVERITY_DIST.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Alerts Trend */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4">
            Tren Akumulasi Anomali EWS Mingguan
          </h3>
          <div className="h-60 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ALERT_TREND_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="week" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
                <Bar dataKey="Critical" fill="#EF4444" stackId="a" />
                <Bar dataKey="High" fill="#F97316" stackId="a" />
                <Bar dataKey="Medium" fill="#F59E0B" stackId="a" />
                <Bar dataKey="Low" fill="#3B82F6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Active Alerts List panel */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
        
        {/* Filters Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4.5 w-4.5 text-[#1D4ED8]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Antrean Peringatan Dini Sistem
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs w-full lg:w-auto font-semibold">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari pesan peringatan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-full focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              <option value="">Semua Tingkatan</option>
              <option value="Critical">Critical (Bahaya)</option>
              <option value="High">High (Tinggi)</option>
              <option value="Medium">Medium (Sedang)</option>
              <option value="Low">Low (Rendah)</option>
            </select>

            {/* Unit Filter */}
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              <option value="">Semua Eselon I</option>
              <option value="DJP">DJP</option>
              <option value="DJBC">DJBC</option>
              <option value="DJKN">DJKN</option>
              <option value="DJPb">DJPb</option>
              <option value="BPPK">BPPK</option>
              <option value="Setjen">Setjen</option>
              <option value="Itjen">Itjen</option>
            </select>
          </div>
        </div>

        {/* Alerts List stream */}
        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-450 italic text-xs font-semibold">
              Tidak ada peringatan aktif terdeteksi yang sesuai dengan filter Anda.
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`rounded-xl border p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-semibold ${
                  alert.status === 'Selesai'
                    ? 'bg-slate-50/50 border-slate-100 dark:bg-slate-900/10 dark:border-slate-850 opacity-60'
                    : alert.severity === 'Critical'
                    ? 'bg-rose-500/5 border-rose-200/50 dark:border-rose-950/20'
                    : alert.severity === 'High'
                    ? 'bg-orange-500/5 border-orange-200/50 dark:border-orange-950/20'
                    : alert.severity === 'Medium'
                    ? 'bg-amber-500/5 border-amber-200/50 dark:border-amber-950/20'
                    : 'bg-blue-500/5 border-blue-200/50 dark:border-blue-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    alert.status === 'Selesai' ? 'bg-slate-200 text-slate-400 dark:bg-slate-800' :
                    alert.severity === 'Critical' ? 'bg-rose-500/10 text-rose-600' :
                    alert.severity === 'High' ? 'bg-orange-500/10 text-orange-600' :
                    alert.severity === 'Medium' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-450 dark:text-slate-400">{alert.id}</span>
                      <span className="text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded">
                        {alert.unit}
                      </span>
                      <span className={`text-[9px] font-black uppercase rounded-md px-1.5 py-0.5 border ${
                        alert.status === 'Selesai' ? 'bg-slate-100 text-slate-450 border-slate-200/20' :
                        alert.severity === 'Critical' ? 'bg-rose-100 text-rose-850 border-rose-500/10' :
                        alert.severity === 'High' ? 'bg-orange-100 text-orange-850 border-orange-500/10' :
                        alert.severity === 'Medium' ? 'bg-amber-100 text-amber-850 border-amber-500/10' :
                        'bg-blue-100 text-blue-850 border-blue-500/10'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-250 leading-relaxed text-xs">
                      {alert.message}
                    </p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" /> Dipicu pada: {alert.date}
                    </div>
                  </div>
                </div>

                {/* Actions button */}
                <div className="shrink-0 flex items-center gap-2 md:self-center">
                  {alert.status === 'Selesai' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Terverifikasi
                    </span>
                  ) : (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="px-2.5 py-1 bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Verifikasi
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>

      {/* Toast Notification element */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300 bg-white/90 dark:bg-[#111827]/90 border-slate-200/50 dark:border-slate-800">
          <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-600">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {toast.message}
          </span>
        </div>
      )}

    </div>
  );
}
