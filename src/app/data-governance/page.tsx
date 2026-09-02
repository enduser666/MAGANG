'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDb } from '@/providers/DbContext';
import {
  ShieldCheck,
  GitBranch,
  Layers,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Settings,
  HelpCircle,
  Play,
  RotateCcw,
  Check,
  X,
  FileSpreadsheet,
  RefreshCw,
  Info,
  Server,
  User
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface LineageNode {
  id: string;
  type: 'file' | 'sheet' | 'table' | 'dashboard' | 'report';
  name: string;
  subName: string;
  badge: string;
  owner: string;
  lastModified: string;
  details: Record<string, string | number>;
  upstream: string[];
  downstream: string[];
}

export default function DataGovernance() {
  const { dbType, getHeaders, connectionStatus } = useDb();
  const [activeTab, setActiveTab] = useState<'quality' | 'lineage' | 'metadata' | 'health'>('quality');

  // --- COMMON STATE ---
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('temuan_pengawasan');
  const [loading, setLoading] = useState(false);

  // --- TAB: QUALITY STATE ---
  const [kpis, setKpis] = useState({
    totalRecords: 1452890,
    validRecords: 1430120,
    duplicates: 4500,
    missingValues: 15200,
    schemaErrors: 3070,
    healthScore: 98.4
  });

  const qualityTrendData = [
    { name: 'Oct 1', Score: 83 },
    { name: 'Oct 8', Score: 85 },
    { name: 'Oct 15', Score: 88 },
    { name: 'Oct 22', Score: 92 },
    { name: 'Oct 29', Score: 90.5 }
  ];

  const [violations, setViolations] = useState<any[]>([
    { id: '#A992-B1X', field: 'NPWP_Number', issueType: 'Format Mismatch', severity: 'CRITICAL', suggestedFix: 'Expected 15 digits, found 14. Possible leading zero dropped.', status: 'OPEN' },
    { id: '#C341-Z8T', field: 'Transaction_Date', issueType: 'Future Date', severity: 'WARNING', suggestedFix: 'Date logged is tomorrow. Check timezone settings on source server.', status: 'OPEN' },
    { id: '#F002-L4P', field: 'Tax_Amount', issueType: 'Out of Range', severity: 'CRITICAL', suggestedFix: 'Value exceeds standard variance threshold (>300%). Flag for manual audit.', status: 'OPEN' }
  ]);

  // --- TAB: LINEAGE STATE ---
  const [activeNode, setActiveNode] = useState<string>('node-table');
  const [nodes, setNodes] = useState<LineageNode[]>([]);
  const [tableMetadata, setTableMetadata] = useState<any[]>([]);
  const [tableLineage, setTableLineage] = useState<any>({ upstream: [], downstream: [] });

  const [dbHealth, setDbHealth] = useState<any>({
    engine: 'Loading...',
    storageSize: 'Loading...',
    activeConnections: 0,
    primaryKeysState: 'Loading...',
    indexesState: 'Loading...',
    foreignKeysState: 'Loading...',
    schemaDrift: 'Loading...'
  });

  // Fetch tables and db health
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getHeaders();
        const res = await fetch('/api/tables', { headers });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setTablesList(data.data);
        }

        const healthRes = await fetch('/api/db-health', { headers });
        const healthData = await healthRes.json();
        if (healthData.success) {
          setDbHealth(healthData.data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [dbType, connectionStatus, getHeaders]);

  // Calculate dynamic properties on selection change
  useEffect(() => {
    if (!selectedTable) return;
    const activeTbl = tablesList.find(t => t.name === selectedTable) || {
      displayName: selectedTable,
      sourceFile: selectedTable + '.sql',
      creator: 'System',
      createdAt: new Date().toISOString(),
      rowCount: kpis.totalRecords,
      columns: [],
      qualityScore: kpis.healthScore
    };

    const recordsCount = kpis.totalRecords || 0;
    const schemaColumnsCount = tableMetadata.length || 0;

    const pipelineNodes: LineageNode[] = [];

    // Add Upstream nodes
    tableLineage.upstream.forEach((up: any, i: number) => {
      pipelineNodes.push({
        id: `node-up-${i}`,
        type: 'table',
        name: up.table,
        subName: 'Upstream Dependency',
        badge: 'FOREIGN KEY',
        owner: 'System',
        lastModified: 'Automated',
        details: {
          'Table': up.table,
          'Linked via': up.column
        },
        upstream: [],
        downstream: ['node-table']
      });
    });

    // Add Main Table Node
    pipelineNodes.push({
      id: 'node-table',
      type: 'table',
      name: activeTbl.name || selectedTable,
      subName: 'Tabel Utama',
      badge: 'TERINDEKS',
      owner: 'System Database',
      lastModified: new Date(activeTbl.createdAt).toLocaleTimeString(),
      details: {
        'Nama Tabel': activeTbl.name || selectedTable,
        'Jumlah Row': recordsCount,
        'Skor Kualitas': `${activeTbl.qualityScore || kpis.healthScore}%`
      },
      upstream: tableLineage.upstream.map((_: any, i: number) => `node-up-${i}`),
      downstream: tableLineage.downstream.map((_: any, i: number) => `node-down-${i}`)
    });

    // Add Downstream nodes
    tableLineage.downstream.forEach((down: any, i: number) => {
      pipelineNodes.push({
        id: `node-down-${i}`,
        type: 'table',
        name: down.table,
        subName: 'Downstream Dependency',
        badge: 'FOREIGN KEY',
        owner: 'System',
        lastModified: 'Automated',
        details: {
          'Table': down.table,
          'Linked via': down.column
        },
        upstream: ['node-table'],
        downstream: []
      });
    });

    // If no lineage, add a dummy report node just to show connection
    if (pipelineNodes.length === 1) {
      pipelineNodes.push({
        id: 'node-report',
        type: 'report',
        name: 'Dashboard Analytics',
        subName: 'Visualisasi Widget',
        badge: 'PLANNED',
        owner: 'System',
        lastModified: 'N/A',
        details: {
          'Status': 'Coming Soon / Not Configured'
        },
        upstream: ['node-table'],
        downstream: []
      });
      pipelineNodes[0].downstream = ['node-report'];
    }

    setNodes(pipelineNodes);
  }, [selectedTable, tablesList, kpis, tableMetadata, tableLineage]);

  // Load Quality KPIs dynamically based on selected table
  const fetchQualityData = useCallback(async (tableName: string) => {
    setSelectedTable(tableName);
    if (!tableName) return;
    setLoading(true);

    try {
      const headers = getHeaders();
      const res = await fetch(`/api/data-governance/table-metrics?table=${tableName}`, { headers });
      const data = await res.json();

      if (data.success) {
        const metrics = data.data.metrics;
        
        setKpis({
          totalRecords: metrics.totalRecords,
          validRecords: metrics.validRecords,
          duplicates: metrics.duplicates,
          missingValues: metrics.missingValues,
          schemaErrors: 0, // Simplify for now
          healthScore: metrics.healthScore
        });

        setTableMetadata(data.data.metadata || []);
        setTableLineage(data.data.lineage || { upstream: [], downstream: [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (selectedTable) {
      fetchQualityData(selectedTable);
    }
  }, [selectedTable, fetchQualityData]);

  const handleFixViolation = (id: string) => {
    setViolations(violations.map((v) => (v.id === id ? { ...v, status: 'RESOLVED' } : v)));
    alert(`Rekomendasi tindakan perbaikan untuk isu ${id} sukses diterapkan!`);
  };

  const getActiveNodeData = () => {
    return nodes.find(n => n.id === activeNode) || nodes[2];
  };

  const activeNodeData = getActiveNodeData();

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
            Data Governance Center
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">Tata Kelola Data (Governance)</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Tabel Aktif:</span>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
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
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-bold text-slate-550">
        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'quality'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="h-4 w-4" /> Kualitas Data (Quality)
        </button>
        <button
          onClick={() => setActiveTab('lineage')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'lineage'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GitBranch className="h-4 w-4" /> Aliran Data (Lineage)
        </button>
        <button
          onClick={() => setActiveTab('metadata')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'metadata'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" /> Metadata & Kamus Data
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            activeTab === 'health'
              ? 'border-[#1D4ED8] text-[#1D4ED8]'
              : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" /> Kesehatan Basis Data
        </button>
      </div>

      {/* --- TAB CONTENT: DATA QUALITY --- */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Total Baris (Records)</span>
              <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">{kpis.totalRecords.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-emerald-600 font-bold block mt-1">+12.4k vs minggu lalu</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Baris Valid</span>
              <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">{kpis.validRecords.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-[#1D4ED8] font-bold block mt-1">{kpis.healthScore}% Skor Integritas</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Duplikasi Data</span>
              <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">{kpis.duplicates.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-slate-400 font-bold block mt-1">Saringan otomatis</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Sel Kosong (Nulls)</span>
              <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">{kpis.missingValues.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-red-500 font-bold block mt-1">Deteksi kelengkapan</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Tipe Tidak Sesuai</span>
              <p className="text-xl font-black mt-1 text-slate-900 dark:text-white">{kpis.schemaErrors.toLocaleString('id-ID')}</p>
              <span className="text-[9px] text-red-500 font-bold block mt-1">Evaluasi skema</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">Tren Skor Kualitas Data (Quality Score)</h4>
              <div className="h-[200px] text-[9px] font-bold">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={qualityTrendData} margin={{ left: -25, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" stroke="#94A3B8" />
                    <YAxis domain={[50, 100]} stroke="#94A3B8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="Score" stroke="#1D4ED8" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
              <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-3">Persentase Validasi</h4>
              <div className="space-y-3.5 flex-1 flex flex-col justify-center text-xs font-semibold">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Passed (Lolos Validasi)</span>
                    <span className="font-bold">{kpis.healthScore}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${kpis.healthScore}%` }}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Warnings (Perlu Review)</span>
                    <span className="font-bold">1.3%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '1.3%' }}></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Errors (Format Gagal)</span>
                    <span className="font-bold">0.3%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: '0.3%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Anomali / Pelanggaran Kualitas Data */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider">Log Temuan Anomali Kualitas Data (Quality Violations)</h4>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-350">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-555">
                  <tr>
                    <th className="px-4 py-3 text-left w-24">Isu ID</th>
                    <th className="px-4 py-3 text-left w-36">Kolom / Field</th>
                    <th className="px-4 py-3 text-left w-32">Jenis Isu</th>
                    <th className="px-4 py-3 text-center w-24">Tingkat Kerawanan</th>
                    <th className="px-4 py-3 text-left">Saran Perbaikan / Koreksi</th>
                    <th className="px-4 py-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-bold">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" /> Menjalankan validasi skema...
                      </td>
                    </tr>
                  ) : violations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-450 italic">
                        Semua data tervalidasi bersih. Tidak ada anomali terdeteksi.
                      </td>
                    </tr>
                  ) : (
                    violations.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-400">{v.id}</td>
                        <td className="px-4 py-2.5 font-semibold">{v.field}</td>
                        <td className="px-4 py-2.5">{v.issueType}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[8.5px] font-black ${
                            v.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-500/10' : 'bg-amber-100 text-amber-800 border-amber-500/10'
                          }`}>{v.severity}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 italic max-w-xs truncate" title={v.suggestedFix}>{v.suggestedFix}</td>
                        <td className="px-4 py-2.5 text-center">
                          {v.status === 'RESOLVED' ? (
                            <span className="text-emerald-600 font-bold flex items-center justify-center gap-1 text-[10px]">
                              <Check className="h-3.5 w-3.5" /> Bersih
                            </span>
                          ) : (
                            <button
                              onClick={() => handleFixViolation(v.id)}
                              className="px-2 py-0.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded text-[9px] font-bold cursor-pointer transition-all"
                            >
                              Terapkan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: DATA LINEAGE --- */}
      {activeTab === 'lineage' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm overflow-x-auto min-h-[400px] flex items-center justify-center relative">
            <div className="flex items-center gap-6 min-w-[700px] py-10">
              {nodes.map((node, idx) => {
                const isActive = node.id === activeNode;
                const NodeIcon = node.type === 'file' ? FileSpreadsheet 
                  : node.type === 'sheet' ? Layers
                  : node.type === 'table' ? Database
                  : node.type === 'dashboard' ? ShieldCheck
                  : Layers;

                return (
                  <React.Fragment key={node.id}>
                    {idx > 0 && idx !== 4 && (
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                      </div>
                    )}
                    {idx === 4 && (
                      <div className="absolute right-40 top-1/2 -translate-y-12">
                        <div className="h-24 w-12 border-r-2 border-b-2 border-dashed border-slate-200 dark:border-slate-800" />
                      </div>
                    )}
                    <div
                      onClick={() => setActiveNode(node.id)}
                      className={`w-48 p-4 rounded-xl border transition-all duration-150 cursor-pointer select-none relative ${
                        isActive
                          ? 'border-[#1D4ED8] bg-blue-500/5 ring-2 ring-[#1D4ED8]/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {isActive && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#1D4ED8] ring-3 ring-blue-500/25" />}
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 uppercase">
                        {node.badge}
                      </span>
                      <div className="flex items-center gap-2.5 mt-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-[#1D4ED8] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                          <NodeIcon className="h-4 w-4" />
                        </div>
                        <div className="truncate min-w-0 flex-1">
                          <h4 className="font-extrabold text-[11px] truncate text-slate-850 dark:text-white" title={node.name}>{node.name}</h4>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">{node.subName}</p>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="absolute bottom-4 left-4 text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
              <Info className="h-4 w-4 text-[#1D4ED8]" /> Klik pada simpul untuk melihat analisis dependensi dan metadata terperinci.
            </div>
          </div>

          {activeNodeData && (
            <div className="lg:col-span-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-4 text-xs font-semibold">
                <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                  <h3 className="font-black text-slate-850 dark:text-white uppercase tracking-wider">Metadata Node</h3>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide mt-0.5">Analisis Aliran Data</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-850 border border-slate-100 dark:border-slate-850 rounded-lg overflow-hidden">
                  {Object.entries(activeNodeData.details).map(([key, val]) => (
                    <div key={key} className="flex justify-between p-2.5 bg-slate-50/20">
                      <span className="text-slate-450 font-bold">{key}:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{val}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-lg p-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Upstream</span>
                    <span className="text-base font-black text-slate-850 dark:text-white mt-0.5 block">{activeNodeData.upstream.length}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-lg p-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Downstream</span>
                    <span className="text-base font-black text-[#1D4ED8] mt-0.5 block">{activeNodeData.downstream.length}</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-[10px] text-slate-400 font-bold flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> <span>Pemilik: {activeNodeData.owner}</span></div>
                <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> <span>Sinkronisasi: {activeNodeData.lastModified}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TAB CONTENT: METADATA & KAMUS DATA --- */}
      {activeTab === 'metadata' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Kamus Data Kamus Relasional</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Struktur kolom dari tabel <span className="font-mono text-[#1D4ED8]">{selectedTable}</span>.</p>
            </div>
            <span className="text-[10px] bg-blue-500/10 text-[#1D4ED8] px-2 py-0.5 rounded font-bold">Total Kolom: {tableMetadata.length}</span>
          </div>

          <div className="space-y-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-900/10 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-xs text-slate-900 dark:text-white">{selectedTable}</h4>
                  <span className="text-[9px] font-mono bg-[#1d4ed8]/10 text-[#1d4ed8] px-1.5 py-0.5 rounded font-bold">{kpis.totalRecords} baris data</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {tableMetadata.map((c: any) => (
                    <div key={c.name} className="bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-3 rounded-lg flex flex-col justify-center gap-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1">
                          {c.name} 
                          {c.key === 'PRI' && <span className="text-[8px] bg-amber-500/20 text-amber-600 px-1 py-0.5 rounded uppercase">PK</span>}
                          {c.key === 'MUL' && <span className="text-[8px] bg-blue-500/20 text-blue-600 px-1 py-0.5 rounded uppercase">FK</span>}
                        </span>
                        <span className="text-[9px] font-mono uppercase bg-slate-100 dark:bg-slate-850 text-slate-500 px-1.5 py-0.5 rounded shrink-0">{c.type}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">Nullable: {c.isNullable === 'YES' ? 'Yes' : 'No'}</div>
                      {c.comment && <div className="text-[9px] text-slate-500 italic mt-1">{c.comment}</div>}
                    </div>
                  ))}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: DATABASE HEALTH --- */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <h4 className="font-black text-xs text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Server className="h-4.5 w-4.5 text-[#1D4ED8]" /> Database Specs</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-850">
              <div className="flex justify-between py-2"><span>Engine DB</span><span className="font-bold text-slate-900 dark:text-white">{dbHealth.engine}</span></div>
              <div className="flex justify-between py-2"><span>Total Storage Size</span><span className="font-bold text-slate-900 dark:text-white">{dbHealth.storageSize}</span></div>
              <div className="flex justify-between py-2"><span>Connection Status</span><span className="font-bold text-emerald-600">CONNECTED</span></div>
              <div className="flex justify-between py-2"><span>Active Connections</span><span className="font-bold text-slate-900 dark:text-white">{dbHealth.activeConnections} Client(s)</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <h4 className="font-black text-xs text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck className="h-4.5 w-4.5 text-[#1D4ED8]" /> Index & Integrity Health</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-850">
              <div className="flex justify-between py-2"><span>Primary Keys Registered</span><span className="font-bold text-emerald-600">{dbHealth.primaryKeysState}</span></div>
              <div className="flex justify-between py-2"><span>Indexes State</span><span className="font-bold text-emerald-600">{dbHealth.indexesState}</span></div>
              <div className="flex justify-between py-2"><span>Foreign Key Checks</span><span className="font-bold text-emerald-600">{dbHealth.foreignKeysState}</span></div>
              <div className="flex justify-between py-2"><span>Schema Drift Detected</span><span className="font-bold text-slate-900 dark:text-white">{dbHealth.schemaDrift}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-xs text-slate-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-4.5 w-4.5 text-[#1D4ED8]" /> Auto-Backup Status</h4>
              <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Planned</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-850 opacity-60">
              <div className="flex justify-between py-2"><span>Last Daily Backup</span><span className="font-bold">-</span></div>
              <div className="flex justify-between py-2"><span>Next Schedule Run</span><span className="font-bold">-</span></div>
              <div className="flex justify-between py-2"><span>Storage Location</span><span className="font-bold">Not Configured</span></div>
              <div className="flex justify-between py-2"><span>Backup Encryption</span><span className="font-bold">-</span></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
