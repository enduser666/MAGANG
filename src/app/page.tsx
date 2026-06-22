'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useDb } from '@/context/DbContext';
import {
  Database,
  UploadCloud,
  FileSpreadsheet,
  Users,
  Star,
  Activity,
  History,
  TrendingUp,
  Play,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface Kpis {
  totalRecords: number;
  avgRating: number;
  totalVotes: number;
  totalViewership: number;
  uniqueDirectors: number;
  uniqueWriters: number;
}

export default function Dashboard() {
  const { dbType, connectionStatus, setDbType, getHeaders } = useDb();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis>({
    totalRecords: 0,
    avgRating: 0,
    totalVotes: 0,
    totalViewership: 0,
    uniqueDirectors: 0,
    uniqueWriters: 0
  });
  const [history, setHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getHeaders();
      
      // 1. Fetch all episodes to compute KPIs
      const epRes = await fetch('/api/episodes?limit=500', { headers });
      const epData = await epRes.json();
      
      if (!epData.success) {
        throw new Error(epData.message || 'Failed to fetch records');
      }

      // 2. Fetch history and logs
      const historyRes = await fetch('/api/history', { headers });
      const historyData = await historyRes.json();

      if (epData.success) {
        const episodes = epData.data || [];
        
        // Compute KPIs
        const totalRecords = episodes.length;
        const avgRating = totalRecords > 0 
          ? Number((episodes.reduce((acc: number, cur: any) => acc + cur.rating, 0) / totalRecords).toFixed(2)) 
          : 0;
        const totalVotes = episodes.reduce((acc: number, cur: any) => acc + cur.votes, 0);
        const totalViewership = Number(episodes.reduce((acc: number, cur: any) => acc + cur.viewership, 0).toFixed(2));
        
        // Count unique directors and writers
        const directors = new Set<string>();
        const writers = new Set<string>();
        episodes.forEach((e: any) => {
          if (e.director) {
            e.director.split(',').forEach((d: string) => directors.add(d.trim()));
          }
          if (e.writers) {
            // Writers are separated by | or and
            e.writers.split(/\||and/g).forEach((w: string) => {
              const cleaned = w.trim();
              if (cleaned) writers.add(cleaned);
            });
          }
        });

        setKpis({
          totalRecords,
          avgRating,
          totalVotes,
          totalViewership,
          uniqueDirectors: directors.size,
          uniqueWriters: writers.size
        });
      }

      if (historyData.success) {
        setHistory(historyData.history || []);
        setLogs(historyData.logs || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while loading dashboard.');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, dbType, connectionStatus]);

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all migrated records, upload history, and audit logs? This cannot be undone.')) {
      return;
    }
    try {
      const headers = getHeaders();
      await fetch('/api/episodes', { method: 'DELETE', headers });
      await fetch('/api/history', { method: 'DELETE', headers });
      fetchDashboardData();
    } catch (err: any) {
      alert('Failed to clear data: ' + err.message);
    }
  };

  const getCompletenessScore = () => {
    if (history.length === 0) return 0;
    const total = history.reduce((acc, curr) => acc + curr.totalRecords, 0);
    if (total === 0) return 0;
    const success = history.reduce((acc, curr) => acc + curr.migratedRecords, 0);
    return Math.round((success / total) * 100);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Data Migration Control Room
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Simulate and execute spreadsheet-to-MySQL data ingestion, validate schemas, and analyze parsed data patterns.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all hover:translate-y-[-1px] active:translate-y-0"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Spreadsheets
          </Link>
          <button
            onClick={handleClearData}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            Reset Platform
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Error loading database:</span> {errorMsg}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Records */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-2 relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Migrated Records</p>
            <h3 className="text-3xl font-bold text-foreground">
              {loading ? '...' : kpis.totalRecords}
            </h3>
            <p className="text-xs text-muted-foreground">Total records in database</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl relative z-10 group-hover:scale-105 transition-transform duration-200">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Avg Rating */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-2 relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average Rating</p>
            <h3 className="text-3xl font-bold text-foreground">
              {loading ? '...' : kpis.avgRating} <span className="text-sm font-medium text-muted-foreground">/ 10</span>
            </h3>
            <p className="text-xs text-muted-foreground">Weighted score across episodes</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl relative z-10 group-hover:scale-105 transition-transform duration-200">
            <Star className="h-6 w-6 fill-amber-500" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Total Viewership */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-2 relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Viewership</p>
            <h3 className="text-3xl font-bold text-foreground">
              {loading ? '...' : kpis.totalViewership} <span className="text-sm font-medium text-muted-foreground">M</span>
            </h3>
            <p className="text-xs text-muted-foreground">Summed viewer impressions</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl relative z-10 group-hover:scale-105 transition-transform duration-200">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Directors/Writers */}
        <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="space-y-2 relative z-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Creative Contributors</p>
            <h3 className="text-3xl font-bold text-foreground">
              {loading ? '...' : `${kpis.uniqueDirectors} / ${kpis.uniqueWriters}`}
            </h3>
            <p className="text-xs text-muted-foreground">Directors / Writers active</p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 rounded-xl relative z-10 group-hover:scale-105 transition-transform duration-200">
            <Users className="h-6 w-6" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Database Provider Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: Database Selector and Stats */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-foreground">Database Provider Selection</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sandbox Card */}
              <button
                onClick={() => setDbType('sandbox')}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                  dbType === 'sandbox'
                    ? 'border-purple-500 bg-purple-500/5 ring-1 ring-purple-500'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="font-bold text-sm text-foreground">Local Sandbox Database</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${dbType === 'sandbox' ? 'bg-purple-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Zero configuration fallback using a mock local JSON file database (`sandbox_db.json`). Perfect for immediate testing.
                </p>
              </button>

              {/* MySQL Card */}
              <button
                onClick={() => setDbType('mysql')}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                  dbType === 'mysql'
                    ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                    : 'border-border bg-background hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="font-bold text-sm text-foreground">MySQL Database Connection</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${dbType === 'mysql' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect to a real local or cloud MySQL instance. Requires connection credentials (host, port, username, database).
                </p>
              </button>
            </div>

            {dbType === 'mysql' ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950 text-xs">
                <span className="text-muted-foreground">Configure or check connection settings in DB Migration.</span>
                <Link href="/migrate" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Manage Connection <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-950 text-xs">
                <span className="text-muted-foreground">Using Sandbox fallback. Data changes will save to your workspace.</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">Sandbox Ready</span>
              </div>
            )}
          </div>

          {/* Import History */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-foreground">Recent Import Operations</h2>
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground mb-4">No import files registered yet.</p>
                <Link
                  href="/import"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  Start importing spreadsheet <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40 font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Filename</th>
                      <th className="px-4 py-3 text-left">Upload Date</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Migrated</th>
                      <th className="px-4 py-3 text-right">Failed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {history.slice(0, 5).map((h) => (
                      <tr key={h.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium truncate max-w-[180px]" title={h.fileName}>{h.fileName}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {new Date(h.importTime).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                            h.status === 'SUCCESS' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' 
                              : h.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                          }`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{h.migratedRecords} / {h.totalRecords}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-rose-600 dark:text-rose-400">{h.failedRecords}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Data Completeness and System Logs console */}
        <div className="space-y-6">
          {/* Data Quality Completeness gauge card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-foreground">Platform Quality Score</h2>
            </div>
            
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="relative flex items-center justify-center">
                {/* Circular indicator SVG */}
                <svg className="h-32 w-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - getCompletenessScore() / 100)}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-foreground">{getCompletenessScore()}%</span>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">Complete</p>
                </div>
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-sm font-semibold text-foreground">Migration Quality Score</h4>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Reflects data ingestion success rate and cell completeness.
                </p>
              </div>
            </div>
          </div>

          {/* Audit Logs Console */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-[284px]">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg text-foreground">System Audit Console</h2>
            </div>

            <div className="flex-1 bg-zinc-950 dark:bg-black rounded-lg p-3 font-mono text-[10px] text-zinc-400 overflow-y-auto space-y-2 border border-zinc-800">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic py-10 text-center">
                  No activity logs registered.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="leading-relaxed border-b border-zinc-900 pb-1.5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-zinc-500 mb-0.5">
                      <span className="font-semibold text-primary">{log.action}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-zinc-300 leading-snug">{log.details}</p>
                    <span className="text-zinc-600 block text-[9px]">by {log.user}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
