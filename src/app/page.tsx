'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDb } from '@/providers/DbContext';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Clock,
  Building,
  RefreshCw,
  Activity,
  Database,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';

const CustomTooltipJenis = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-md shadow-md">
        <p className="font-bold text-slate-800 dark:text-white mb-2">{label}</p>
        <div className="text-sm">
          <p style={{ color: '#1D4ED8' }} className="mb-1">dalamProses : {data.dalamProses}</p>
          <p style={{ color: '#16A34A' }} className="mb-1">tuntas : {data.tuntas}</p>
          <p className="text-slate-600 dark:text-slate-300 font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            Total : {data.total}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { dbType, getHeaders, connectionStatus } = useDb();
  
  const [activeTable, setActiveTable] = useState('rekap_rekomendasi_minimize__2_');
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real data states
  const [stats, setStats] = useState({
    totalLhp: 0,
    totalFindings: 0,
    totalRekomendasi: 0,
    completionRate: 0,
  });
  const [jenisData, setJenisData] = useState<any[]>([]);
  const [dynamicStatuses, setDynamicStatuses] = useState<any[]>([]);
  const [unitFindingsData, setUnitFindingsData] = useState<any[]>([]);
  
  const [activities, setActivities] = useState<any[]>([]);
  const [datasetsList, setDatasetsList] = useState<any[]>([]);
  
  // RBAC & Unit Filter states
  const [userSession, setUserSession] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [dbUnits, setDbUnits] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const headers = getHeaders();
        
        // 1. Fetch User Session and Units for RBAC
        const [meRes, unitsRes] = await Promise.all([
          fetch('/api/auth/me', { headers }),
          fetch('/api/units', { headers })
        ]);
        
        let currentUnit = '';
        if (unitsRes.ok) {
           const unitsData = await unitsRes.json();
           if (unitsData.success) {
             setDbUnits(unitsData.data);
           }
        }

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success && meData.data) {
             setUserSession(meData.data);
             if (meData.data.accessScope === 'OWN_UNIT' && meData.data.unitId) {
                currentUnit = String(meData.data.unitId);
                setSelectedUnit(currentUnit);
             }
          }
        }
        
        const filterUnit = selectedUnit || currentUnit;

        // 2. Fetch Analytics Data
        const analyticsRes = await fetch(`/api/dashboard/analytics?unit_id=${filterUnit}&table=${activeTable}&_t=${Date.now()}`, { headers, cache: 'no-store' });
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          if (analyticsData.success && analyticsData.data) {
             const d = analyticsData.data;
             
             // Update stats
             setStats({
               totalLhp: d.totalLhp || 0,
               totalFindings: d.totalFindings || 0,
               totalRekomendasi: d.totalRekomendasi || 0,
               completionRate: d.statusSummary?.total > 0 ? Number(((d.statusSummary.tuntas / d.statusSummary.total) * 100).toFixed(1)) : 0,
             });

             if (d.jenisData) setJenisData(d.jenisData);
             if (d.unitFindingsData) {
               const maxVal = Math.max(...d.unitFindingsData.map((i: any) => Number(i.Rekomendasi) || Number(i.Temuan) || Number(i.count) || Number(i.value) || 0));
               const coloredData = d.unitFindingsData.map((item: any) => {
                 const val = Number(item.Rekomendasi) || Number(item.Temuan) || Number(item.count) || Number(item.value) || 0;
                 return {
                   ...item,
                   valueToPlot: val,
                   fill: val === maxVal ? '#2563EB' : '#1E3A8A'
                 };
               });
               setUnitFindingsData(coloredData);
             }
             if (d.dynamicStatuses) {
               // Add colors to dynamic statuses based on the screenshot
               const colorMap: Record<string, string> = {
                 'Belum Tindaklanjut': '#ff0400ff', // blue
                 'Dalam Proses': '#fca801ff', // green
                 'Diusulkan Sesuai': '#042cf7ff', // red
                 'Diusulkan TPTD': '#0bf5e2ff', // orange
                 'Sesuai': '#00f800ff', // purple
                 'TPTD': '#fc04ebff', // pink
               };
               const coloredStatuses = d.dynamicStatuses.map((s: any) => ({
                 ...s,
                 color: colorMap[s.name] || '#94A3B8'
               }));
               setDynamicStatuses(coloredStatuses);
             }
          }
        }

        // 3. Fetch recent histories and logs
        const histRes = await fetch('/api/history', { headers });
        if (histRes.ok) {
           const histData = await histRes.json();
           if (histData.success) {
             setActivities(histData.logs || []);
             setDatasetsList(histData.history || []);
           }
        }
        
        // Fetch tables list
        const tblRes = await fetch('/api/tables', { headers });
        if (tblRes.ok) {
          const tblData = await tblRes.json();
          if (tblData.success) setTablesList(tblData.data || []);
        }

      } catch (e) {
        console.error('Error fetching dashboard details:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeTable, dbType, connectionStatus, selectedUnit]);

  return (
    <div className="space-y-7 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Top Banner: Breadcrumbs & Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Executive Overview</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Real-time insights across all integrated Ministry of Finance units.</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Unit:</span>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              disabled={userSession?.accessScope === 'OWN_UNIT'}
              className={`rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] ${userSession?.accessScope === 'OWN_UNIT' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {userSession?.accessScope !== 'OWN_UNIT' && <option value="">Semua Unit</option>}
              {dbUnits.map(u => (
                <option key={u.id} value={u.id}>
                  {userSession?.accessScope === 'OWN_UNIT' && String(u.id) !== selectedUnit ? `🔒 ${u.kode_unit}` : (userSession?.accessScope === 'OWN_UNIT' && String(u.id) === selectedUnit ? `🔒 ${u.kode_unit}` : u.kode_unit)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Sumber Data:</span>
            <select
              value={activeTable}
              onChange={(e) => setActiveTable(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1D4ED8] cursor-pointer"
            >
              <option value="sidata_test">sidata_test</option>
              {tablesList.map(t => (
                <option key={t.name} value={t.name}>{t.displayName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. KPI Cards list */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Jumlah LHP */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">JUMLAH LHP</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalLhp ? stats.totalLhp.toLocaleString('id-ID') : '-'}
            </h3>
          </div>
          <div className="absolute right-4 bottom-4 text-indigo-500/10 dark:text-indigo-500/5">
            <FileText className="h-10 w-10" />
          </div>
        </div>

        {/* Jumlah Temuan */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">JUMLAH TEMUAN</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalFindings.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="absolute right-4 bottom-4 text-amber-500/10 dark:text-amber-500/5">
            <AlertTriangle className="h-10 w-10" />
          </div>
        </div>

        {/* Jumlah Rekomendasi */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">JML REKOMENDASI</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalRekomendasi.toLocaleString('id-ID')}
            </h3>
          </div>
          <div className="absolute right-4 bottom-4 text-orange-500/10 dark:text-orange-500/5">
            <CheckCircle className="h-10 w-10" />
          </div>
        </div>

        {/* Penyelesaian TLHP */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs relative overflow-hidden group">
          <div className="space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">PENYELESAIAN TLHP</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.completionRate}%
            </h3>
          </div>
          <div className="absolute right-4 bottom-4 text-emerald-500/10 dark:text-emerald-500/5">
            <ShieldCheck className="h-10 w-10" />
          </div>
        </div>
      </div>

      {/* 2. Charts Area layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Jenis Pemeriksaan (Stacked Bar Chart) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Jenis Pemeriksaan</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jenisData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="jenis" stroke="#94A3B8" fontSize={10} fontStyle="bold" />
                <YAxis stroke="#94A3B8" fontSize={10} fontStyle="bold" />
                <Tooltip content={<CustomTooltipJenis />} cursor={{fill: 'transparent'}} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="tuntas" stackId="a" fill="#00A65A" radius={[0, 0, 0, 0]} barSize={120} />
                <Bar dataKey="dalamProses" stackId="a" fill="#1D4ED8" radius={[0, 0, 0, 0]} barSize={120} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Tindak Lanjut (Donut Chart) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Status Tindak Lanjut</h3>
          </div>
          <div className="flex-1 h-[200px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dynamicStatuses}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dynamicStatuses.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toLocaleString('id-ID')} Rekomendasi`} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center rate layout */}
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.completionRate}%</span>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">SELESAI</p>
            </div>
          </div>
          {/* Donut Legend */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            {dynamicStatuses.map((d) => (
              <div key={d.name} className="flex flex-col items-center">
                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                  {d.name}
                </span>
                <span className="font-extrabold text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">{d.value.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Unit in Charge (Horizontal Bar Chart) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Unit in Charge</h3>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={unitFindingsData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis type="number" stroke="#94A3B8" fontSize={9} fontStyle="bold" />
              <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={9} fontStyle="bold" width={100} interval={0} tick={{ fontSize: 9 }} />
              <Tooltip cursor={{ fill: 'transparent' }} />
              <Bar dataKey="valueToPlot" name="Rekomendasi" barSize={20}>
                {unitFindingsData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || '#1E3A8A'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
