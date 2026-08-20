'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/providers/DbContext';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  AlertOctagon,
  TrendingUp,
  Activity,
  Plus,
  Play,
  Share2,
  Save,
  Search,
  ChevronDown,
  Trash2,
  Loader2,
  HelpCircle,
  X,
  Database,
  Clock,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle,
  AlertTriangle,
  Building,
  RefreshCw,
  Cpu,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export default function MonitoringAnalisis() {
  const { dbType, getHeaders, connectionStatus } = useDb();
  const [activeTab, setActiveTab] = useState<'executive' | 'charts' | 'kpi' | 'risk' | 'pipeline'>('executive');

  // --- TAB: EXECUTIVE OVERVIEW STATE & DATA ---
  const [activeTable, setActiveTable] = useState('temuan_pengawasan');
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFindings: 0,
    highRisk: 0,
    repeated: 0,
    completionRate: 0,
    integratedUnits: 0
  });
  const [datasetsList, setDatasetsList] = useState<any[]>([]);

  const [findingsTrendData, setFindingsTrendData] = useState<any[]>([]);
  const [tindakLanjutData, setTindakLanjutData] = useState<any[]>([]);
  const [unitFindingsData, setUnitFindingsData] = useState<any[]>([]);

  const [riskRegister, setRiskRegister] = useState<any[]>([]);
  const [riskDistData, setRiskDistData] = useState<any[]>([]);
  const [riskTrendData, setRiskTrendData] = useState<any[]>([]);

  const [kpiUnitsPerformance, setKpiUnitsPerformance] = useState<any[]>([]);
  const [ikuTrendData, setIkuTrendData] = useState<any[]>([]);

  // --- TAB: CHARTS (BI CREATOR) STATE & DATA ---
  const [selectedTable, setSelectedTable] = useState<string>('temuan_pengawasan');
  const [columns, setColumns] = useState<any[]>([]);
  const [widgets, setWidgets] = useState<any[]>([]);
  const [widgetsLoading, setWidgetsLoading] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState('Dampak Finansial per Wilayah');
  const [widgetType, setWidgetType] = useState<'bar' | 'line' | 'donut' | 'area' | 'kpi' | 'table'>('bar');
  const [xAxisCol, setXAxisCol] = useState('wilayah');
  const [yAxisCol, setYAxisCol] = useState('dampak_finansial');
  const [aggregatedChartData, setAggregatedChartData] = useState<any[]>([]);
  const [kpiValue, setKpiValue] = useState<string | number>(0);
  const [showGuide, setShowGuide] = useState(false);

  // --- TAB: RISK MANAGEMENT STATE & DATA ---
  const [selectedProb, setSelectedProb] = useState<number | null>(null);
  const [selectedImp, setSelectedImp] = useState<number | null>(null);

  // Load datasets and widgets list
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      const tblRes = await fetch('/api/tables', { headers });
      const tblData = await tblRes.json();
      if (tblData.success) {
        setTablesList(tblData.data || []);
        if (tblData.data.length > 0) {
          const activeTbl = tblData.data.find((t: any) => t.name === selectedTable) || tblData.data[0];
          setSelectedTable(activeTbl.name);
          setColumns(activeTbl.columns || []);
        }
      }

      const histRes = await fetch('/api/history', { headers });
      const histData = await histRes.json();
      if (histData.success) {
        setDatasetsList(histData.history || []);
      }

      // Fetch saved BI widgets
      const widgetRes = await fetch('/api/widgets', { headers });
      const widgetData = await widgetRes.json();
      if (widgetData.success) {
        setWidgets(widgetData.data || []);
      }

      // Fetch dynamic stats from selected table via Analytics API
      if (activeTable) {
        const anlRes = await fetch(`/api/dashboard/analytics?tableName=${activeTable}`, { headers });
        const anlData = await anlRes.json();
        
        if (anlData.success && anlData.data) {
          const d = anlData.data;
          const st = d.statusDistribution || { selesai: 0, proses: 0, belum: 0 };
          
          const totalRecordsForRate = d.totalFindings || 0;
          const completionRate = totalRecordsForRate > 0 ? Number(((st.selesai / totalRecordsForRate) * 100).toFixed(1)) : 0;
          
          setStats({
            totalFindings: d.totalFindings || 0,
            highRisk: d.highRiskCount || 0,
            repeated: d.repeatedCount || 0,
            completionRate: completionRate,
            integratedUnits: (d.topUnits && d.topUnits.length > 0) ? d.topUnits.length : 0
          });

          setTindakLanjutData([
            { name: 'Selesai', value: st.selesai || 0, color: '#16A34A' },
            { name: 'Proses', value: st.proses || 0, color: '#1D4ED8' },
            { name: 'Terlambat/Belum', value: st.belum || 0, color: '#DC2626' }
          ].filter(x => x.value > 0));

          if (d.trendData) {
            setFindingsTrendData(d.trendData.map((t: any) => ({
              name: t.name,
              Temuan: t.Temuan
            })));
          } else {
            setFindingsTrendData([]);
          }
          
          if (d.topUnits && d.topUnits.length > 0) {
             setUnitFindingsData(d.topUnits.map((u: any) => ({
               name: u.unitName || 'Unit',
               Temuan: u.Temuan || 0
             })));
          } else {
             setUnitFindingsData([]);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching analytics details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeTable, dbType, connectionStatus]);

  // Handle selected table change in BI Creator
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    const activeTbl = tablesList.find(t => t.name === tableName);
    if (activeTbl) {
      setColumns(activeTbl.columns || []);
      if (activeTbl.columns.length > 0) {
        setXAxisCol(activeTbl.columns[0].name);
        setYAxisCol(activeTbl.columns[0].name);
      }
    }
  };

  // Run dynamic data aggregation for Live Preview
  const runDataAggregation = useCallback(async () => {
    if (!selectedTable || !xAxisCol || !yAxisCol) return;
    try {
      const headers = getHeaders();
      const res = await fetch(`/api/tables/${selectedTable}?limit=1000`, { headers });
      const data = await res.json();
      
      if (data.success && data.data.length > 0) {
        const rows = data.data;

        if (widgetType === 'kpi') {
          const isNumeric = columns.find(c => c.name === yAxisCol)?.type === 'number';
          if (isNumeric) {
            const sum = rows.reduce((acc: number, curr: any) => acc + Number(curr[yAxisCol] || 0), 0);
            setKpiValue(sum >= 1000000 ? `Rp ${(sum / 1000000000).toFixed(2)} M` : sum);
          } else {
            setKpiValue(rows.length);
          }
          return;
        }

        const groups: Record<string, number> = {};
        rows.forEach((row: any) => {
          const xVal = String(row[xAxisCol] || 'Tidak Diketahui');
          const yVal = Number(row[yAxisCol] || 0);

          if (!groups[xVal]) groups[xVal] = 0;
          
          const isNumeric = columns.find(c => c.name === yAxisCol)?.type === 'number';
          if (isNumeric) {
            groups[xVal] += yVal;
          } else {
            groups[xVal] += 1;
          }
        });

        const formatted = Object.entries(groups).map(([name, value]) => ({
          name,
          value
        }));
        
        setAggregatedChartData(formatted);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedTable, xAxisCol, yAxisCol, widgetType, columns, getHeaders]);

  useEffect(() => {
    runDataAggregation();
  }, [runDataAggregation]);

  const handleCreateWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    setWidgetsLoading(true);

    try {
      const headers = getHeaders();
      const res = await fetch('/api/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          title: widgetTitle,
          type: widgetType,
          sourceTable: selectedTable,
          xColumn: xAxisCol,
          yColumn: yAxisCol
        })
      });

      const data = await res.json();
      if (data.success) {
        // Reload widgets list
        const widgetRes = await fetch('/api/widgets', { headers });
        const wData = await widgetRes.json();
        if (wData.success) setWidgets(wData.data || []);
        setWidgetTitle('Visual Baru');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWidgetsLoading(false);
    }
  };

  const handleDeleteWidget = async (id: number) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`/api/widgets/${id}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        setWidgets(widgets.filter(w => w.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to determine Risk Matrix coordinate color
  const getRiskLevel = (p: number, i: number) => {
    const score = p * i;
    if (score >= 15) return { name: 'High', color: 'bg-rose-500/80 hover:bg-rose-600 text-white border-rose-600' };
    if (score >= 6) return { name: 'Medium', color: 'bg-amber-400/80 hover:bg-amber-500 text-slate-900 border-amber-500' };
    return { name: 'Low', color: 'bg-emerald-500/80 hover:bg-emerald-600 text-white border-emerald-600' };
  };

  const handleCellClick = (prob: number, imp: number) => {
    if (selectedProb === prob && selectedImp === imp) {
      setSelectedProb(null);
      setSelectedImp(null);
    } else {
      setSelectedProb(prob);
      setSelectedImp(imp);
    }
  };

  const filteredRisks = riskRegister.filter(risk => {
    const matchesProb = selectedProb ? risk.prob === selectedProb : true;
    const matchesImp = selectedImp ? risk.imp === selectedImp : true;
    return matchesProb && matchesImp;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
            Monitoring & Analisis Hub
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">Monitoring & Analisis</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            <Share2 className="h-4 w-4" /> Bagikan Laporan
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-bold text-slate-550">
        <button
          onClick={() => setActiveTab('executive')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'executive'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" /> Overview Eksekutif
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'charts'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Kreator Visual (BI)
        </button>
        <button
          onClick={() => setActiveTab('kpi')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'kpi'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Target className="h-4 w-4" /> Indikator Kinerja (IKU)
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'risk'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertOctagon className="h-4 w-4" /> Tren Risiko Organisasi
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'pipeline'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="h-4 w-4" /> Status Sinkronisasi
        </button>
      </div>

      {/* --- TAB CONTENT: EXECUTIVE OVERVIEW --- */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Sumber Dashboard Eksekutif</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Gunakan pemilih untuk memuat performa unit kerja dinamis.</p>
            </div>
            <select
              value={activeTable}
              onChange={(e) => setActiveTable(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="temuan_pengawasan">Temuan Pengawasan (Preloaded)</option>
              {tablesList
                .filter(t => t.name !== 'temuan_pengawasan')
                .map(t => (
                  <option key={t.name} value={t.name}>{t.displayName}</option>
                ))
              }
            </select>
          </div>

          {/* KPI scorecards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Temuan Audit</span>
              <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{stats.totalFindings.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-red-500 font-bold block mt-1">+12% MoM</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Temuan Risiko Tinggi</span>
              <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{stats.highRisk.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-red-500 font-bold block mt-1">+18% MoM</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Tingkat Penyelesaian TLHP</span>
              <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{stats.completionRate}%</p>
              <span className="text-[9px] text-emerald-600 font-bold block mt-1">+2.1% MoM</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Unit Terintegrasi</span>
              <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{stats.integratedUnits}</p>
              <span className="text-[9px] text-slate-400 font-bold block mt-1">100% Terpantau</span>
            </div>
          </div>

          {/* Charts area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">Tren Temuan Pengawasan</h4>
              <div className="h-[260px] text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={findingsTrendData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="Temuan" stroke="#1D4ED8" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2">Status Tindak Lanjut</h4>
              <div className="h-[180px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tindakLanjutData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2} dataKey="value">
                      {tindakLanjutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.completionRate}%</span>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Selesai</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold border-t border-slate-100 dark:border-slate-800 pt-3">
                {tindakLanjutData.map(d => (
                  <div key={d.name} className="flex flex-col">
                    <span className="text-slate-450 flex items-center justify-center gap-1 text-[9px]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }}></span> {d.name}</span>
                    <span className="text-slate-800 dark:text-slate-200 mt-0.5">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Temuan per Unit chart */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">Temuan per Unit Eselon I</h4>
            <div className="h-60 text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitFindingsData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip />
                  <Bar dataKey="Temuan" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: CHARTS (BI CREATOR) --- */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Sumber Data Pemantauan</label>
              <select
                value={selectedTable}
                onChange={(e) => handleTableChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-bold focus:outline-none"
              >
                {tablesList.map(t => (
                  <option key={t.name} value={t.name}>{t.displayName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kolom Skema Database</label>
              <div className="space-y-1 max-h-[320px] overflow-y-auto border border-slate-50 dark:border-slate-850 rounded-lg p-2">
                {columns.map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs font-semibold select-none cursor-pointer"
                    onClick={() => {
                      if (c.type === 'number') {
                        setYAxisCol(c.name);
                      } else {
                        setXAxisCol(c.name);
                      }
                    }}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {c.type === 'number' ? <span className="text-[#1D4ED8] font-bold">∑</span> : <span className="text-slate-400">品</span>}
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="text-[8px] uppercase text-slate-450">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-blue-500/5 dark:bg-[#1e293b]/20 border-2 border-dashed border-[#1D4ED8]/30 rounded-xl p-5 relative">
              <span className="absolute top-4 right-4 text-[9px] uppercase font-black tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
                Pratinjau Langsung
              </span>
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase mb-4 pr-16">{widgetTitle}</h4>
              <div className="h-[220px] flex items-center justify-center text-[10px]">
                {widgetType === 'kpi' ? (
                  <div className="text-center">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">{kpiValue}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total {yAxisCol}</p>
                  </div>
                ) : widgetType === 'bar' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aggregatedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-850" />
                      <XAxis dataKey="name" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip />
                      <Bar dataKey="value" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : widgetType === 'line' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={aggregatedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-850" />
                      <XAxis dataKey="name" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#1D4ED8" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : widgetType === 'area' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={aggregatedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" className="dark:stroke-slate-850" />
                      <XAxis dataKey="name" stroke="#94A3B8" />
                      <YAxis stroke="#94A3B8" />
                      <Tooltip />
                      <Area type="monotone" dataKey="value" fill="#1D4ED8" fillOpacity={0.1} stroke="#1D4ED8" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : widgetType === 'donut' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={aggregatedChartData} dataKey="value" innerRadius={50} outerRadius={70}>
                        {aggregatedChartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#1D4ED8' : i === 1 ? '#0f172a' : '#475569'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full max-h-[180px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg text-[10px]">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-slate-550 font-bold">
                        <tr>
                          <th className="px-3 py-2 text-left">Kategori</th>
                          <th className="px-3 py-2 text-right">Nilai Agregasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedChartData.map((d, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-semibold">{d.name}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold">{d.value.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {widgets.length === 0 ? (
                <div className="col-span-2 border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-[#111827] text-center text-slate-400 text-xs">
                  Tidak ada visualisasi kustom yang disimpan. Silakan buat menggunakan form di sebelah kanan.
                </div>
              ) : (
                widgets.map((w) => (
                  <div key={w.id} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs relative group flex flex-col justify-between">
                    <button
                      onClick={() => handleDeleteWidget(w.id)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <h5 className="text-[10px] font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2">{w.title}</h5>
                    <div className="h-[120px] flex items-center justify-center text-[8px] font-semibold text-slate-500">
                      📊 Visual kustom [{w.type}] dihubungkan ke {w.sourceTable}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
            <form onSubmit={handleCreateWidget} className="space-y-4 text-xs font-semibold">
              <h4 className="font-black text-slate-850 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Bangun Visual</h4>
              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-400 block">Judul Visual</label>
                <input
                  type="text"
                  required
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-400 block">Tipe Visual</label>
                <select
                  value={widgetType}
                  onChange={(e) => setWidgetType(e.target.value as any)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                  <option value="donut">Donut Chart</option>
                  <option value="kpi">KPI Scorecard</option>
                  <option value="table">Table View</option>
                </select>
              </div>

              {widgetType !== 'kpi' && (
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-slate-400 block">Sumbu X (Dimensi)</label>
                  <select
                    value={xAxisCol}
                    onChange={(e) => setXAxisCol(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-slate-400 block">Sumbu Y (Ukuran)</label>
                <select
                  value={yAxisCol}
                  onChange={(e) => setYAxisCol(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={widgetsLoading}
                className="w-full bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {widgetsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan Visual
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: KPI PERFORMANCE --- */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">Pencapaian Realisasi IKU vs Target Unit Eselon I</h4>
              <div className="h-64 text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpiUnitsPerformance} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis domain={[80, 100]} stroke="#94A3B8" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Target" fill="#94A3B8" />
                    <Bar dataKey="Realisasi" fill="#1D4ED8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">Tren Indikator Kinerja Utama (IKU) Nasional</h4>
              <div className="h-64 text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ikuTrendData} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="year" stroke="#94A3B8" />
                    <YAxis domain={[80, 100]} stroke="#94A3B8" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="IKU1" stroke="#1D4ED8" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="IKU2" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: RISK TREND --- */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Matriks Peta Paparan Risiko (5x5 Heatmap)</h4>
                {(selectedProb || selectedImp) && (
                  <button
                    onClick={() => { setSelectedProb(null); setSelectedImp(null); }}
                    className="text-[9px] font-bold text-[#1D4ED8] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Reset Filter Matrix
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                <div className="w-full max-w-sm">
                  <div className="grid grid-cols-6 gap-1 text-[9px] font-bold text-center">
                    <div className="col-span-1 grid grid-rows-5 gap-1 items-center justify-end pr-1.5 text-slate-400">
                      <div>5 (Hampir Pasti)</div>
                      <div>4 (Sering)</div>
                      <div>3 (Mungkin)</div>
                      <div>2 (Jarang)</div>
                      <div>1 (Hampir Tidak)</div>
                    </div>
                    <div className="col-span-5 grid grid-cols-5 gap-1">
                      {[5, 4, 3, 2, 1].map(prob => 
                        [1, 2, 3, 4, 5].map(imp => {
                          const level = getRiskLevel(prob, imp);
                          const isSelected = selectedProb === prob && selectedImp === imp;
                          const count = riskRegister.filter(r => r.prob === prob && r.imp === imp).length;
                          return (
                            <button
                              key={`${prob}-${imp}`}
                              onClick={() => handleCellClick(prob, imp)}
                              className={`aspect-square rounded border transition-all flex flex-col items-center justify-center cursor-pointer ${level.color} ${
                                isSelected ? 'ring-3 ring-blue-500 scale-105 z-10 shadow-md' : 'opacity-80 hover:opacity-100'
                              }`}
                            >
                              <span className="text-[12px] font-black">{count || ''}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="col-span-1"></div>
                    <div className="col-span-5 grid grid-cols-5 gap-1 mt-1 text-slate-400">
                      <div>1 (Minor)</div>
                      <div>2 (Kecil)</div>
                      <div>3 (Sedang)</div>
                      <div>4 (Besar)</div>
                      <div>5 (Bencana)</div>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-56 bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-850 rounded-xl text-[11px] leading-relaxed text-slate-500">
                  <Info className="h-4 w-4 text-[#1D4ED8] inline mr-1" />
                  Pilih kotak matriks koordinat untuk menyaring kerawanan register di bawah.
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">Tren Profil Kerawanan</h4>
              <div className="h-60 text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={riskTrendData} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="month" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="RisikoTinggi" stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey="TotalRisiko" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Register Profil Risiko Terpantau</h4>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-350">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left w-16">ID</th>
                    <th className="px-4 py-3 text-left w-32">Kategori</th>
                    <th className="px-4 py-3 text-left">Deskripsi Kerawanan</th>
                    <th className="px-4 py-3 text-left w-24">Risk Owner</th>
                    <th className="px-4 py-3 text-center w-20">Prob</th>
                    <th className="px-4 py-3 text-center w-20">Impact</th>
                    <th className="px-4 py-3 text-center w-24">Exposure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRisks.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2 font-mono font-bold text-slate-400">{r.id}</td>
                      <td className="px-4 py-2 font-semibold">{r.kategori}</td>
                      <td className="px-4 py-2 text-slate-900 dark:text-slate-200">{r.deskripsi}</td>
                      <td className="px-4 py-2 font-bold text-slate-500">{r.owner}</td>
                      <td className="px-4 py-2 text-center">{r.prob}</td>
                      <td className="px-4 py-2 text-center">{r.imp}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                          r.prob * r.imp >= 15 ? 'bg-red-100 text-red-800 border-red-500/10' : 'bg-amber-100 text-amber-800 border-amber-500/10'
                        }`}>{r.prob * r.imp} ({r.status})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: PIPELINE --- */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Success Rate</span>
                <h4 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">98.2%</h4>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg"><CheckCircle className="h-6 w-6" /></div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Pekerjaan Gagal (Failed)</span>
                <h4 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">1 Job</h4>
              </div>
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg"><AlertTriangle className="h-6 w-6" /></div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Queue Status</span>
                <h4 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">IDLE</h4>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><Cpu className="h-6 w-6" /></div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Rata-Rata Waktu Sync</span>
                <h4 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">1.5 detik</h4>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg"><Clock className="h-6 w-6" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Aktivitas Pipeline Sinkronisasi Terkini</h4>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-350">
                <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-555">
                  <tr>
                    <th className="px-4 py-3 text-left">Job ID</th>
                    <th className="px-4 py-3 text-left">Nama Pekerjaan (Ingestion Job)</th>
                    <th className="px-4 py-3 text-left">Tanggal Mulai</th>
                    <th className="px-4 py-3 text-right">Durasi</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-400">#JOB-2026-092</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">Ingestion: tax_revenue_fy23_final</td>
                    <td className="px-4 py-3.5 text-slate-400">2026-06-24 14:30:10</td>
                    <td className="px-4 py-3.5 text-right font-mono">1,820 ms</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">SUCCESS</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-400">#JOB-2026-091</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">Ingestion: customs_clearance_q3</td>
                    <td className="px-4 py-3.5 text-slate-400">2026-06-23 09:15:05</td>
                    <td className="px-4 py-3.5 text-right font-mono">1,450 ms</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">SUCCESS</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
