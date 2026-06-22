'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useDb } from '@/context/DbContext';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileCode,
  Layers,
  HelpCircle,
  RefreshCw,
  Info,
  Sliders,
  Sparkles
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

interface QualityStats {
  completeness: number;
  duplicatesCount: number;
  missingCount: number;
  migrationRate: number;
  totalRecords: number;
}

export default function DataQuality() {
  const { dbType, getHeaders, connectionStatus } = useDb();

  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [stats, setStats] = useState<QualityStats>({
    completeness: 100,
    duplicatesCount: 0,
    missingCount: 0,
    migrationRate: 100,
    totalRecords: 0
  });

  const [missingReport, setMissingReport] = useState<{ id: number; title: string; field: string }[]>([]);
  const [duplicateReport, setDuplicateReport] = useState<{ key: string; count: number; ids: number[] }[]>([]);

  const fetchQualityData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getHeaders();
      
      // 1. Fetch episodes
      const epRes = await fetch('/api/episodes?limit=5000', { headers });
      const epData = await epRes.json();

      // 2. Fetch history
      const historyRes = await fetch('/api/history', { headers });
      const historyData = await historyRes.json();

      if (epData.success) {
        const list = epData.data || [];
        
        // Scan for missing values (excluding nullable columns like guestStars, but checking others)
        const missing: { id: number; title: string; field: string }[] = [];
        const requiredFields = ['season', 'title', 'summary', 'rating', 'votes', 'viewership', 'duration', 'director', 'writers'];
        
        let emptyCount = 0;
        let totalCells = list.length * requiredFields.length;

        list.forEach((ep: any) => {
          requiredFields.forEach((field) => {
            const val = ep[field];
            if (val === undefined || val === null || val === '') {
              emptyCount++;
              missing.push({
                id: ep.id,
                title: ep.title,
                field: field.toUpperCase()
              });
            }
          });
        });

        // Scan for duplicates (matching Title + Season)
        const dupGroups: Record<string, number[]> = {};
        list.forEach((ep: any) => {
          const key = `S${ep.season}: ${ep.title.toLowerCase().trim()}`;
          if (!dupGroups[key]) {
            dupGroups[key] = [];
          }
          dupGroups[key].push(ep.id);
        });

        const duplicates = Object.entries(dupGroups)
          .filter(([_, ids]) => ids.length > 1)
          .map(([key, ids]) => ({
            key,
            count: ids.length,
            ids
          }));

        const totalDuplicates = duplicates.reduce((acc, curr) => acc + (curr.count - 1), 0);
        
        // Completeness calculation
        const completeness = totalCells > 0 ? Math.round(((totalCells - emptyCount) / totalCells) * 100) : 100;

        // Migration Success Rate calculation from History logs
        let migrationRate = 100;
        if (historyData.success && historyData.history && historyData.history.length > 0) {
          const totalRecordsMigrated = historyData.history.reduce((acc: number, curr: any) => acc + curr.totalRecords, 0);
          const totalSuccess = historyData.history.reduce((acc: number, curr: any) => acc + curr.migratedRecords, 0);
          migrationRate = totalRecordsMigrated > 0 ? Math.round((totalSuccess / totalRecordsMigrated) * 100) : 100;
        }

        setEpisodes(list);
        setMissingReport(missing.slice(0, 15)); // Cap report listing
        setDuplicateReport(duplicates);
        setStats({
          completeness,
          duplicatesCount: totalDuplicates,
          missingCount: emptyCount,
          migrationRate,
          totalRecords: list.length
        });
      }
    } catch (e) {
      console.error('Failed to run quality checks:', e);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchQualityData();
  }, [fetchQualityData, dbType, connectionStatus]);

  const getHealthStatus = () => {
    if (stats.totalRecords === 0) return { label: 'Empty Database', color: 'text-slate-500 bg-slate-100 dark:bg-slate-900 border-slate-200' };
    if (stats.completeness >= 98 && stats.duplicatesCount === 0) {
      return { label: 'Excellent / Healthy', color: 'text-emerald-800 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200' };
    }
    if (stats.completeness >= 90 && stats.duplicatesCount <= 5) {
      return { label: 'Warning / Review Advised', color: 'text-amber-800 bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 border-amber-250' };
    }
    return { label: 'Critical Errors Detected', color: 'text-rose-800 bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 border-rose-250' };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Quality Control</h1>
        <p className="text-sm text-muted-foreground">Monitor relational database integrity constraints, null fields, and migration statistics.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-card border border-border rounded-xl">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Auditing database schema records...</span>
        </div>
      ) : episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-card border border-border rounded-xl shadow-sm">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/30" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">Quality Check Empty</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Please migrate records first to analyze dataset quality reports and integrity constraints.
            </p>
          </div>
          <Link
            href="/import"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
          >
            Go to Data Import
          </Link>
        </div>
      ) : (
        /* Quality dashboard grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Health indicators and Audit reports */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick stats panel */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-primary" /> Integrity Dashboard
                </h3>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${health.color}`}>
                  {health.label}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted/40 p-4 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Completeness</span>
                  <span className="text-2xl font-black text-foreground mt-1 block">{stats.completeness}%</span>
                  <span className="text-[9px] text-muted-foreground block mt-1">Non-null cell percentage</span>
                </div>
                <div className="bg-muted/40 p-4 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Duplicate Rows</span>
                  <span className={`text-2xl font-black mt-1 block ${stats.duplicatesCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
                    {stats.duplicatesCount}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-1">Matching titles & seasons</span>
                </div>
                <div className="bg-muted/40 p-4 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Missing Cells</span>
                  <span className={`text-2xl font-black mt-1 block ${stats.missingCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                    {stats.missingCount}
                  </span>
                  <span className="text-[9px] text-muted-foreground block mt-1">Empty fields in records</span>
                </div>
                <div className="bg-muted/40 p-4 border border-border rounded-xl">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Migration Ingest Rate</span>
                  <span className="text-2xl font-black text-primary mt-1 block">{stats.migrationRate}%</span>
                  <span className="text-[9px] text-muted-foreground block mt-1">Data parser transfer rate</span>
                </div>
              </div>
            </div>

            {/* Missing values audit panel */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" /> Missing Required Fields Log
                </h3>
                <span className="text-xs text-muted-foreground">Showing top 15 omissions</span>
              </div>

              {missingReport.length === 0 ? (
                <div className="text-center py-8 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  All required database fields are fully populated! No null values detected.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg max-h-[220px]">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead className="bg-muted/40 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Record ID</th>
                        <th className="px-4 py-2 text-left">Episode Reference</th>
                        <th className="px-4 py-2 text-left text-rose-600 dark:text-rose-400">Empty Field Attribute</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground bg-card">
                      {missingReport.map((m, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2 font-mono font-semibold text-muted-foreground">{m.id}</td>
                          <td className="px-4 py-2 font-medium truncate max-w-[200px]" title={m.title}>{m.title}</td>
                          <td className="px-4 py-2 font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold">{m.field}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Duplicate values audit panel */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" /> Duplicate Constraint Violations
              </h3>

              {duplicateReport.length === 0 ? (
                <div className="text-center py-8 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  No duplicate title constraints found in the active database! Unique index is healthy.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border rounded-lg max-h-[200px]">
                  <table className="min-w-full divide-y divide-border text-xs">
                    <thead className="bg-muted/40 font-semibold text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Duplicate Key Match</th>
                        <th className="px-4 py-2 text-center">Clones Detected</th>
                        <th className="px-4 py-2 text-right">Duplicate Database IDs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-foreground bg-card">
                      {duplicateReport.map((d, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-4 py-2 font-semibold capitalize text-amber-600 dark:text-amber-400">{d.key}</td>
                          <td className="px-4 py-2 text-center font-mono font-bold">{d.count} copies</td>
                          <td className="px-4 py-2 text-right font-mono text-muted-foreground">{d.ids.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Column 3: Rules configuration and explanation */}
          <div className="space-y-6">
            
            {/* Rules Checklist */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Relational Schema Rules</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Rules applied by the platform parser during file analysis and dynamic database table mapping checks:
              </p>

              <div className="space-y-3.5 text-xs">
                {/* Rule 1 */}
                <div className="flex items-start gap-3">
                  <div className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <span className="font-bold text-foreground block">Season Numeric Constraint</span>
                    <p className="text-muted-foreground text-[10px]">Season attribute must be positive integer mapping directly between 1 and 9.</p>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="flex items-start gap-3">
                  <div className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <span className="font-bold text-foreground block">Title String Requirement</span>
                    <p className="text-muted-foreground text-[10px]">EpisodeTitle cannot be empty. Represented as VARCHAR(255) non-null inside database.</p>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="flex items-start gap-3">
                  <div className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <span className="font-bold text-foreground block">Decimal Type Mappings</span>
                    <p className="text-muted-foreground text-[10px]">Ratings and Viewership are converted to Floats (Double). Default empty to 0.0.</p>
                  </div>
                </div>

                {/* Rule 4 */}
                <div className="flex items-start gap-3">
                  <div className="h-4.5 w-4.5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] flex-shrink-0 mt-0.5">4</div>
                  <div>
                    <span className="font-bold text-foreground block">DateTime Format Ingestion</span>
                    <p className="text-muted-foreground text-[10px]">Dates must be parseable by native Date.parse engine, matching releaseDate columns.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help desk card */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <HelpCircle className="h-4.5 w-4.5 text-primary" /> Quality Actions
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If data quality issues are detected:
              </p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>Use <Link href="/explorer" className="text-primary hover:underline font-semibold">Data Explorer</Link> to search, locate, and edit/delete invalid rows.</li>
                <li>Verify mapping setups in the <Link href="/migrate" className="text-primary hover:underline font-semibold">DB Migration</Link> wizard.</li>
                <li>Re-upload clean CSV tables to clear previous validation logs.</li>
              </ul>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
