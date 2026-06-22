'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseCsvFile, ParseResult, CsvRow } from '@/lib/csv';
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Grid,
  CornerDownRight,
  Database,
  Info
} from 'lucide-react';

interface ImportLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export default function DataImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState<{ name: string; size: number } | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [previewLimit, setPreviewLimit] = useState(25);

  // Clear previous session data on mount
  useEffect(() => {
    sessionStorage.removeItem('migratable_csv_name');
    sessionStorage.removeItem('migratable_csv_size');
    sessionStorage.removeItem('migratable_csv_rows');
    sessionStorage.removeItem('migratable_csv_duplicates');
    sessionStorage.removeItem('migratable_csv_missing');
  }, []);

  const addLog = (type: ImportLog['type'], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp: time, type, message }]);
  };

  const handleFileContent = async (file: File) => {
    setLoading(true);
    setFileData({ name: file.name, size: file.size });
    setLogs([]);
    addLog('info', `Ingesting file: '${file.name}' (${(file.size / 1024).toFixed(2)} KB)`);

    try {
      const text = await file.text();
      addLog('info', 'File loaded into buffer. Initializing Papaparse parser...');
      
      const result = await parseCsvFile(text);
      setParseResult(result);
      
      // Log parsing sequence
      addLog('success', `Parsed ${result.statistics.totalRecords} records from spreadsheet.`);

      // Validate columns
      if (result.validation.isValid) {
        addLog('success', 'Column schema validation passed. All required columns present.');
      } else {
        addLog('error', `Schema validation failed! Missing columns: ${result.validation.missingColumns.join(', ')}`);
      }

      // Quality stats
      if (result.statistics.duplicateRecords > 0) {
        addLog('warning', `Detected ${result.statistics.duplicateRecords} duplicate rows based on (Season, EpisodeTitle).`);
      } else {
        addLog('success', 'Checked duplicates: None found.');
      }

      if (result.statistics.missingValuesCount > 0) {
        addLog('warning', `Detected ${result.statistics.missingValuesCount} missing cells across required columns.`);
        Object.entries(result.statistics.missingValuesByColumn).forEach(([col, count]) => {
          if (count > 0) {
            addLog('info', ` -> Column '${col}' has ${count} empty records.`);
          }
        });
      } else {
        addLog('success', 'Checked completeness: 100% complete data.');
      }

      // Save valid data to sessionStorage to carry over to migrate tab
      if (result.validation.isValid) {
        sessionStorage.setItem('migratable_csv_name', file.name);
        sessionStorage.setItem('migratable_csv_size', String(file.size));
        sessionStorage.setItem('migratable_csv_rows', JSON.stringify(result.rows));
        sessionStorage.setItem('migratable_csv_duplicates', String(result.statistics.duplicateRecords));
        sessionStorage.setItem('migratable_csv_missing', String(result.statistics.missingValuesCount));
        addLog('success', 'Data loaded into memory. Ready for DB migration.');
      }

    } catch (e: any) {
      addLog('error', `Failed to read file: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileContent(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileContent(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFileData(null);
    setParseResult(null);
    setLogs([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Import Module</h1>
          <p className="text-sm text-muted-foreground">Upload and audit series spreadsheets before running database migration.</p>
        </div>
        {parseResult?.validation.isValid && (
          <button
            onClick={() => router.push('/migrate')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all hover:translate-y-[-1px] active:translate-y-0"
          >
            <Database className="h-4 w-4" />
            Database Migration
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Dropzone & Logs console */}
        <div className="lg:col-span-1 space-y-6">
          {/* File Dropzone */}
          {!fileData ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
                dragActive
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : 'border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 rounded-full bg-primary/10 text-primary mb-4">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Drag and drop spreadsheet</h3>
              <p className="text-xs text-muted-foreground mt-1.5 mb-3 max-w-[200px] mx-auto">
                Supports standard comma-separated `.csv` series tables
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm"
              >
                Browse Files
              </button>
            </div>
          ) : (
            /* Active File Info */
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="truncate pr-4 flex-1">
                  <h4 className="font-bold text-sm text-foreground truncate">{fileData.name}</h4>
                  <span className="text-xs text-muted-foreground font-mono">{(fileData.size / 1024).toFixed(2)} KB</span>
                </div>
                <button
                  onClick={handleReset}
                  className="p-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg text-xs"
                >
                  Change
                </button>
              </div>

              {parseResult && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-muted/40 p-3 rounded-lg border border-border/50 text-center">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Total Records</span>
                    <span className="text-lg font-bold text-foreground">{parseResult.statistics.totalRecords}</span>
                  </div>
                  <div className={`p-3 rounded-lg border text-center ${
                    parseResult.validation.isValid 
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Validation</span>
                    <span className="text-xs font-bold flex items-center justify-center gap-1 mt-1">
                      {parseResult.validation.isValid ? (
                        <><CheckCircle className="h-3.5 w-3.5" /> PASSED</>
                      ) : (
                        <><XCircle className="h-3.5 w-3.5" /> FAILED</>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Metrics Card */}
          {parseResult && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" /> Audit Quality Scan
              </h4>
              <div className="divide-y divide-border text-xs">
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Completeness Score:</span>
                  <span className="font-bold text-foreground">{parseResult.statistics.completenessPercentage}%</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Duplicate Rows:</span>
                  <span className={`font-bold ${parseResult.statistics.duplicateRecords > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                    {parseResult.statistics.duplicateRecords}
                  </span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-muted-foreground">Missing Values:</span>
                  <span className={`font-bold ${parseResult.statistics.missingValuesCount > 0 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-foreground'}`}>
                    {parseResult.statistics.missingValuesCount} cells
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Log Output */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col h-[260px]">
            <h4 className="font-bold text-sm text-foreground mb-3 flex items-center gap-2">
              <CornerDownRight className="h-4 w-4 text-primary" /> Diagnostic Parser Logs
            </h4>
            <div className="flex-1 bg-zinc-950 dark:bg-black border border-zinc-800 rounded-lg p-3 font-mono text-[10px] overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <div className="text-zinc-600 italic py-16 text-center">
                  Waiting for file upload...
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-zinc-600 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={`font-medium ${
                      log.type === 'success' 
                        ? 'text-emerald-500' 
                        : log.type === 'warning' 
                        ? 'text-amber-500' 
                        : log.type === 'error' 
                        ? 'text-rose-500 font-bold' 
                        : 'text-zinc-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Preview Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <Grid className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Spreadsheet Grid Preview</h3>
              </div>
              {parseResult && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Showing:</span>
                  <select
                    value={previewLimit}
                    onChange={(e) => setPreviewLimit(Number(e.target.value))}
                    className="border border-border rounded px-1.5 py-0.5 bg-background text-foreground text-xs"
                  >
                    <option value={10}>10 records</option>
                    <option value={25}>25 records</option>
                    <option value={50}>50 records</option>
                    <option value={100}>100 records</option>
                  </select>
                </div>
              )}
            </div>

            {!parseResult ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-muted/10 border border-dashed border-border rounded-xl">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No spreadsheet preview loaded.</p>
                <p className="text-xs text-muted-foreground/60 max-w-[240px] mt-1">
                  Upload a series CSV data file in the upload zone to preview and validate records.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-auto border border-border rounded-lg max-h-[500px] mb-3">
                  <table className="min-w-full divide-y divide-border text-xs table-fixed">
                    <thead className="bg-muted/50 font-bold text-muted-foreground sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                      <tr>
                        <th className="px-3 py-2.5 text-left w-12 bg-muted/80">#</th>
                        <th className="px-3 py-2.5 text-left w-16 bg-muted/80">Season</th>
                        <th className="px-3 py-2.5 text-left w-40 bg-muted/80">Title</th>
                        <th className="px-3 py-2.5 text-left w-16 bg-muted/80">Ratings</th>
                        <th className="px-3 py-2.5 text-left w-16 bg-muted/80">Votes</th>
                        <th className="px-3 py-2.5 text-left w-20 bg-muted/80">Viewership</th>
                        <th className="px-3 py-2.5 text-left w-28 bg-muted/80">Date</th>
                        <th className="px-3 py-2.5 text-left w-36 bg-muted/80">Director</th>
                        <th className="px-3 py-2.5 text-left w-72 bg-muted/80">About Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {parseResult.rows.slice(0, previewLimit).map((row, idx) => {
                        const isDuplicate = parseResult.rows.slice(0, idx).some(
                          (r) => r.Season === row.Season && r.EpisodeTitle === row.EpisodeTitle
                        );
                        
                        const emptyCellClass = "bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/20";

                        return (
                          <tr key={idx} className={`hover:bg-muted/10 transition-colors ${isDuplicate ? 'bg-amber-500/5' : ''}`}>
                            <td className="px-3 py-2 text-muted-foreground font-semibold">{idx + 1}</td>
                            <td className={`px-3 py-2 font-mono ${!row.Season ? emptyCellClass : ''}`}>{row.Season || 'N/A'}</td>
                            <td className={`px-3 py-2 font-medium truncate ${!row.EpisodeTitle ? emptyCellClass : ''}`} title={row.EpisodeTitle}>{row.EpisodeTitle || 'N/A'}</td>
                            <td className={`px-3 py-2 font-mono ${!row.Ratings ? emptyCellClass : ''}`}>{row.Ratings || 'N/A'}</td>
                            <td className={`px-3 py-2 font-mono ${!row.Votes ? emptyCellClass : ''}`}>{row.Votes || 'N/A'}</td>
                            <td className={`px-3 py-2 font-mono ${!row.Viewership ? emptyCellClass : ''}`}>{row.Viewership || 'N/A'}</td>
                            <td className={`px-3 py-2 truncate ${!row.Date ? emptyCellClass : ''}`} title={row.Date}>{row.Date || 'N/A'}</td>
                            <td className={`px-3 py-2 truncate ${!row.Director ? emptyCellClass : ''}`} title={row.Director}>{row.Director || 'N/A'}</td>
                            <td className={`px-3 py-2 truncate max-w-xs text-muted-foreground ${!row.About ? emptyCellClass : ''}`} title={row.About}>{row.About || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs text-muted-foreground">
                  <span>Showing top {Math.min(parseResult.rows.length, previewLimit)} records of {parseResult.rows.length}.</span>
                  {parseResult.rows.length > previewLimit && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Table preview is capped. Full set will migrate to the database.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
