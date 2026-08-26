'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDb } from '@/providers/DbContext';
import {
  ClipboardCheck,
  Search,
  Filter,
  FileDown,
  TrendingUp,
  Building2,
  PieChart as PieIcon,
  FolderOpen,
  Calendar,
  Activity,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const PIE_COLORS = ['#1D4ED8', '#D97706', '#10B981', '#6366F1', '#EC4899'];

export default function MonitoringTlhp() {
  const [data, setData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [unitData, setUnitData] = useState<any[]>([]);
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [kpi, setKpi] = useState({ total: 0, selesai: 0, proses: 0, belum: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const { getHeaders } = useDb();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const headers = getHeaders();
        const [tblRes, anlRes, katRes] = await Promise.all([
          fetch('/api/tables/temuan?limit=100', { headers }),
          fetch('/api/dashboard/analytics?tableName=temuan', { headers }),
          fetch('/api/dashboard/temuan-jenis', { headers })
        ]);

        const tbl = await tblRes.json();
        const anl = await anlRes.json();
        const kat = await katRes.json();

        if (tbl.success) {
          const mapping = tbl.metadata?.columnMapping || {};
          const getCol = (key: string) => mapping[key]?.column || '';

          const mapped = (tbl.data?.rows || []).map((r: any, i: number) => {
            const rawStatus = r[getCol('status')] || 'Unknown';
            const normStat = String(rawStatus).trim().toLowerCase();
            let p = 0;
            if (['sesuai', 'tptd', 'diusulkan sesuai', 'diusulkan tptd'].includes(normStat)) {
              p = 100;
            } else if (normStat === 'dalam proses') {
              p = 50;
            }
            return {
              id: r.id || i,
              nomor: r[getCol('finding')] || r[getCol('lhp')] || `Row-${r.id}`,
              unit: r[getCol('unit')] || 'Unknown',
              kategori: r[getCol('finding_type')] || 'Unknown',
              status: rawStatus,
              target: r[getCol('period')] || '-',
              progress: p,
              updated: r.updated_at ? new Date(r.updated_at).toISOString().slice(0, 10) : '-',
              year: new Date().getFullYear()
            };
          });
          setData(mapped);
        }

        if (anl.success && anl.data) {
          const d = anl.data;

          // KPIs derived strictly from API
          const totalTLHPCount = d.totalRekomendasi || d.totalRecords || 0;
          const belumCount = d.dynamicStatuses?.find((s: any) =>
            s.name.toLowerCase() === 'belum tindaklanjut' || s.name.toLowerCase() === 'belum tindak lanjut'
          )?.value || 0;

          const st = d.statusSummary || { tuntas: 0, dalamProses: 0, total: 0 };
          setKpi({
            total: totalTLHPCount,
            selesai: st.tuntas || 0,
            proses: st.dalamProses || 0,
            belum: belumCount
          });

          if (d.dynamicStatuses) {
            setAvailableStatuses(d.dynamicStatuses.map((s: any) => s.name));
            const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
            setStatusData(d.dynamicStatuses.map((s: any, idx: number) => ({
              name: s.name,
              value: s.value,
              color: colors[idx % colors.length]
            })).filter((x: any) => x.value > 0));
          }

          if (d.unitFindingsData) {
            setAvailableUnits(d.unitFindingsData.map((u: any) => u.name));
            setUnitData(d.unitFindingsData.map((u: any) => ({
              name: u.name,
              Selesai: u.tuntas || 0,
              Proses: u.dalamProses || 0
            })));
          }

          if (d.trendData) {
            setTrendData(d.trendData.map((t: any) => ({
              name: t.name,
              Selesai: t.Temuan // bind Temuan to Selesai line in the chart if trendData defines it as Temuan
            })));
          }
        }

        if (kat.success && kat.data) {
          setCategoryData(kat.data.map((k: any) => ({
            name: k.name,
            value: k.Temuan
          })).filter((x: any) => x.value > 0));
        }

      } catch (e) {
        console.error('Failed to fetch TLHP data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filtering
  const filteredData = data.filter(item => {
    const matchesSearch = String(item.nomor).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.kategori).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnit = selectedUnit ? item.unit === selectedUnit : true;
    const matchesYear = selectedYear ? item.year === Number(selectedYear) : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesUnit && matchesYear && matchesStatus;
  });

  // Calculate Metrics from KPI state instead of derived filtering
  const totalTLHP = kpi.total;
  const selesai = kpi.selesai;
  const proses = kpi.proses;
  const belum = kpi.belum;
  const completionRate = totalTLHP > 0 ? Math.round((selesai / totalTLHP) * 100) : 0;

  // Mock Exports
  const handleExport = (format: 'PDF' | 'EXCEL') => {
    const filename = `Laporan_TLHP_${new Date().toISOString().slice(0, 10)}.${format === 'PDF' ? 'pdf' : 'xlsx'}`;
    const fileContent = `SIDATA - TINDAK LANJUT HASIL PENGAWASAN EXPORT\nGenerated: ${new Date().toLocaleString()}\nFormat: ${format}\nTotal Records: ${filteredData.length}`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[#1D4ED8]" /> Monitoring TLHP
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluasi progres penyelesaian Tindak Lanjut Hasil Pengawasan (TLHP) di lingkungan Kementerian Keuangan.
          </p>
        </div>

        {/* Export options */}
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('PDF')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-[#111827] dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-rose-500" /> Ekspor PDF
          </button>
          <button
            onClick={() => handleExport('EXCEL')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-[#111827] dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-emerald-500" /> Ekspor Excel
          </button>
        </div>
      </div>

      {/* KPI Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Total TLHP */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total TLHP</span>
            <Activity className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{totalTLHP}</p>
          <span className="text-[9px] text-slate-400 font-bold block mt-1">Berkas Terdaftar</span>
        </div>

        {/* TLHP Selesai */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">TLHP Selesai</span>
            <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{selesai}</p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">Telah Dituntaskan</span>
        </div>

        {/* TLHP Dalam Proses */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Dalam Proses</span>
            <Clock className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{proses}</p>
          <span className="text-[9px] text-amber-600 font-bold block mt-1">Sedang Diverifikasi</span>
        </div>

        {/* Belum Ditindaklanjuti */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Belum Tindak Lanjut</span>
            <AlertCircle className="h-4.5 w-4.5 text-rose-500" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{belum}</p>
          <span className="text-[9px] text-rose-600 font-bold block mt-1">Segera Ditindaklanjuti</span>
        </div>

        {/* Persentase Penyelesaian */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-[#111827] p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-450 dark:text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Penyelesaian</span>
            <TrendingUp className="h-4.5 w-4.5 text-[#1D4ED8]" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{completionRate}%</p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

      </div>

      {/* Graphical Dashboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Tren Penyelesaian TLHP */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-[#1D4ED8]" /> Tren Penyelesaian TLHP (Kemenkeu)
          </h3>
          <div className="h-64 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="Selesai" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorSelesai)" />
                <Area type="monotone" dataKey="Proses" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorProses)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TLHP per Unit Kerja */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-[#1D4ED8]" /> Perbandingan TLHP per Eselon I
          </h3>
          <div className="h-64 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
                <Bar dataKey="Selesai" stackId="a" fill="#10B981" />
                <Bar dataKey="Proses" stackId="a" fill="#3B82F6" />
                <Bar dataKey="Belum" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status TLHP */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <PieIcon className="h-4 w-4 text-[#1D4ED8]" /> Distribusi Status TLHP Aktif
          </h3>
          <div className="h-64 text-[10px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Kategori Temuan */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-400 mb-4 flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-[#1D4ED8]" /> Klasifikasi Temuan Pengawasan
          </h3>
          <div className="h-64 text-[10px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Legend iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Filters and Datagrid */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">

        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4.5 w-4.5 text-[#1D4ED8]" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Daftar Berkas Pemantauan TLHP
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs w-full lg:w-auto font-semibold">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari TLHP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 w-full focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
              />
            </div>

            {/* Filter Unit Kerja */}
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              <option value="">Semua Eselon I</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>

            {/* Filter Year */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              <option value="">Semua Tahun</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#1D4ED8]"
            >
              <option value="">Semua Status</option>
              {availableStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Datagrid Table */}
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
            <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Nomor TLHP</th>
                <th className="px-4 py-3 text-left">Unit Kerja</th>
                <th className="px-4 py-3 text-left">Kategori Temuan</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Target Penyelesaian</th>
                <th className="px-4 py-3 text-center w-24">Progress</th>
                <th className="px-4 py-3 text-center">Terakhir Diperbarui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-450 italic">
                    Tidak ditemukan data TLHP yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">{item.nomor}</td>
                    <td className="px-4 py-3 font-semibold">{item.unit}</td>
                    <td className="px-4 py-3">{item.kategori}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold border ${item.progress === 100
                        ? 'bg-emerald-100 text-emerald-850 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-500/10'
                        : item.progress > 0
                          ? 'bg-blue-100 text-blue-850 dark:bg-blue-950/20 dark:text-blue-400 border-blue-500/10 animate-pulse'
                          : 'bg-red-100 text-red-850 dark:bg-red-950/20 dark:text-red-400 border-red-500/10'
                        }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-500">{item.target}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full rounded-full ${item.progress === 100 ? 'bg-emerald-500' :
                            item.progress > 0 ? 'bg-blue-500' : 'bg-rose-500'
                            }`} style={{ width: `${item.progress}%` }} />
                        </div>
                        <span className="font-bold shrink-0">{item.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 font-medium">{item.updated}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
