'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDb } from '@/providers/DbContext';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  CheckCircle,
  XCircle,
  FileText,
  AlertTriangle,
  Grid,
  CornerDownRight,
  Database,
  Info,
  Terminal,
  Play,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Plus,
  History,
  Activity,
  Clock,
  Cpu
} from 'lucide-react';

interface ColumnMapping {
  originalName: string;
  mappedName: string;
  type: 'string' | 'number' | 'boolean' | 'date';
}

export default function DataImport() {
  const router = useRouter();
  const { getHeaders, dbType, connectionStatus } = useDb();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importTab, setImportTab] = useState<'upload' | 'history' | 'pipeline'>('upload');

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  
  // SheetJS workbook and sheets details
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetsList, setSheetsList] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Sheet parse results
  const [sheetRows, setSheetRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [inferredColumns, setInferredColumns] = useState<ColumnMapping[]>([]);
  
  // SQL script preview
  const [generatedSql, setGeneratedSql] = useState<string>('');
  const [qualityScore, setQualityScore] = useState<number>(100);
  const [duplicatesCount, setDuplicatesCount] = useState<number>(0);
  const [missingCount, setMissingCount] = useState<number>(0);
  
  const [targetTableName, setTargetTableName] = useState<string>('');
  const [importMode, setImportMode] = useState<'overwrite' | 'append'>('overwrite');

  // Import history states
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Pipeline states
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, [getHeaders]);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await fetch('/api/pipeline', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setJobs(data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJobsLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchHistory();
    fetchJobs();
  }, [dbType, connectionStatus, fetchHistory, fetchJobs]);

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
      await handleFileLoad(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileLoad(e.target.files[0]);
    }
  };

  const handleFileLoad = async (file: File) => {
    setLoading(true);
    console.log('[IMPORT-DIAG] handleFileLoad() called', { fileName: file.name, fileSize: file.size });

    // 1. Maximum file size validation (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Ukuran file melebihi batas 50MB yang diperbolehkan.');
      setLoading(false);
      return;
    }

    // 2. Extension validation
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls' && ext !== '.csv') {
      alert('Format file tidak didukung. Hanya file .xlsx, .xls, atau .csv yang diperbolehkan.');
      setLoading(false);
      return;
    }

    // 3. MIME-type validation
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/comma-separated-values'
    ];
    if (file.type && !allowedMimes.includes(file.type)) {
      alert('MIME type file tidak valid. Silakan unggah file spreadsheet yang valid.');
      setLoading(false);
      return;
    }

    // 4. Filename sanitization (path traversal protection)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
    setFileMeta({ name: sanitizedName, size: file.size });
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        
        setWorkbook(wb);
        setSheetsList(wb.SheetNames);
        
        if (wb.SheetNames.length > 0) {
          handleSheetSelect(wb.SheetNames[0], wb);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('SheetJS load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetSelect = (sheetName: string, activeWb = workbook) => {
    if (!activeWb) return;
    setSelectedSheet(sheetName);
    setTargetTableName(sheetName.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

    const sheet = activeWb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true, cellDates: true } as any);
    console.log('[IMPORT-DIAG] handleSheetSelect() parsed sheet', { sheetName, rowCount: rows.length });
    
    // Prototype Pollution Guard & Date Formatter
    const sanitizedRows = rows.map((row) => {
      const cleanRow: any = {};
      for (const key in row) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        let val = row[key];
        if (typeof val === 'string') {
          val = val.trim();
        } else if (val instanceof Date) {
          // Convert Date objects from SheetJS to YYYY-MM-DD ISO string to prevent timezone offset bugs in DB
          val = val.toISOString().split('T')[0];
        }
        cleanRow[key] = val;
      }
      return cleanRow;
    });
    setSheetRows(sanitizedRows);

    if (rows.length > 0) {
      const firstRow = rows[0];
      const sheetHeaders = Object.keys(firstRow);
      setHeaders(sheetHeaders);

      const mappings = sheetHeaders.map((colName) => {
        const sampleValues = rows.slice(0, 20).map(r => r[colName]);
        let detectedType: 'string' | 'number' | 'boolean' | 'date' = 'string';
        const validSamples = sampleValues.filter(v => v !== undefined && v !== null && v !== '');
        
        if (validSamples.length > 0) {
          const isNumeric = validSamples.every(v => !isNaN(Number(v)));
          const isBoolean = validSamples.every(v => {
            const str = String(v).toLowerCase().trim();
            return str === 'true' || str === 'false' || str === '1' || str === '0' || str === 'ya' || str === 'tidak';
          });
          const isDate = validSamples.every(v => !isNaN(Date.parse(String(v))) && isNaN(Number(v)));

          if (isNumeric) detectedType = 'number';
          else if (isBoolean) detectedType = 'boolean';
          else if (isDate) detectedType = 'date';
        }

        return {
          originalName: colName,
          mappedName: colName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          type: detectedType
        };
      });

      setInferredColumns(mappings);
      calculateQualityStats(rows, mappings);
    } else {
      setHeaders([]);
      setInferredColumns([]);
      setGeneratedSql('');
    }
  };

  const calculateQualityStats = (rows: any[], cols: ColumnMapping[]) => {
    let emptyCells = 0;
    let dupCount = 0;
    const seen = new Set();

    rows.forEach((row) => {
      cols.forEach((c) => {
        const val = row[c.originalName];
        if (val === undefined || val === null || val === '') {
          emptyCells++;
        }
      });

      const rowHash = JSON.stringify(Object.values(row));
      if (seen.has(rowHash)) {
        dupCount++;
      } else {
        seen.add(rowHash);
      }
    });

    setDuplicatesCount(dupCount);
    setMissingCount(emptyCells);

    const totalCells = rows.length * cols.length;
    const missingRate = totalCells > 0 ? (emptyCells / totalCells) : 0;
    const dupRate = rows.length > 0 ? (dupCount / rows.length) : 0;
    
    const score = Math.max(0, Math.round(100 - (missingRate * 50) - (dupRate * 30)));
    setQualityScore(score);
    generateSQLScript(cols);
  };

  const generateSQLScript = (cols: ColumnMapping[]) => {
    if (!fileMeta || !selectedSheet) return;
    const tableName = selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    
    const sqlCols = cols.map((c) => {
      let pgType = 'TEXT';
      if (c.type === 'number') pgType = 'DOUBLE PRECISION';
      else if (c.type === 'boolean') pgType = 'BOOLEAN';
      else if (c.type === 'date') pgType = 'TIMESTAMP WITH TIME ZONE';
      return `  "${c.mappedName}" ${pgType}`;
    });

    sqlCols.unshift('  "id" SERIAL PRIMARY KEY');

    const script = `-- SQL Generation Console (SIDATA Ingest)\n` +
      `CREATE TABLE IF NOT EXISTS "${tableName}" (\n` +
      `${sqlCols.join(',\n')}\n` +
      `);\n\n` +
      `-- Ingestion summary: Inferred ${cols.length} columns from Sheet '${selectedSheet}'`;

    setGeneratedSql(script);
  };

  const handleTypeChange = (index: number, newType: 'string' | 'number' | 'boolean' | 'date') => {
    const updated = [...inferredColumns];
    updated[index].type = newType;
    setInferredColumns(updated);
    generateSQLScript(updated);
  };

  const handleMappedNameChange = (index: number, newName: string) => {
    const updated = [...inferredColumns];
    updated[index].mappedName = newName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    setInferredColumns(updated);
    generateSQLScript(updated);
  };

  const executeDbImport = async () => {
    if (!fileMeta || !selectedSheet || inferredColumns.length === 0) return;
    setLoading(true);

    const tableName = targetTableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') || selectedSheet.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const headers = getHeaders();
    console.log('[IMPORT-DIAG] executeDbImport() called', { selectedSheet, tableName, rowCount: sheetRows.length, dbType: headers['x-db-type'] || 'sandbox' });
    
    const records = sheetRows.map((row) => {
      const mappedRecord: any = {};
      inferredColumns.forEach((col) => {
        let val = row[col.originalName];
        if (col.type === 'number') {
          val = val !== '' ? Number(val) : 0;
        } else if (col.type === 'boolean') {
          const str = String(val).toLowerCase();
          val = str === 'true' || str === '1' || str === 'ya';
        } else if (col.type === 'date') {
          if (val !== '' && val != null) {
            const d = new Date(val);
            val = isNaN(d.getTime()) ? null : d.toISOString();
          } else {
            val = null;
          }
        } else {
          val = String(val);
        }
        mappedRecord[col.mappedName] = val;
      });
      return mappedRecord;
    });

    const payloadBody = JSON.stringify({
      dbType: headers['x-db-type'] || 'sandbox',
      dbConfig: headers['x-db-config'] || null,
      action: 'migrate',
      tableName,
      displayName: targetTableName.trim() || selectedSheet,
      sourceFile: fileMeta.name,
      creator: 'Data Analyst',
      columns: inferredColumns.map(c => ({ name: c.mappedName, type: c.type })),
      records,
      fileSize: fileMeta.size,
      duplicatesCount,
      missingValuesCount: missingCount,
      qualityScore,
      importMode
    });
    console.log('[IMPORT-DIAG] POST /api/db/migrate payload size (bytes):', payloadBody.length, '| records:', records.length, '| tableName:', tableName);

    try {
      const res = await fetch('/api/db/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: payloadBody
      });

      const data = await res.json();
      console.log('[IMPORT-DIAG] /api/db/migrate response:', data);
      if (data.success) {
        alert(importMode === 'append' 
          ? `Berhasil menambahkan ${records.length} baris baru ke tabel '${tableName}'!`
          : `Berhasil mengimpor ${records.length} baris ke tabel '${tableName}'!`
        );
        fetchHistory();
        fetchJobs();
        router.push('/data-pemantauan');
      } else {
        alert('Gagal integrasi database: ' + data.message);
      }
    } catch (e: any) {
      alert('Integrasi database error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFileMeta(null);
    setWorkbook(null);
    setSheetsList([]);
    setSelectedSheet('');
    setSheetRows([]);
    setHeaders([]);
    setInferredColumns([]);
    setGeneratedSql('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const pipelineStages = [
    { name: 'Upload', status: 'SUCCESS', desc: 'Ingestion file buffer load' },
    { name: 'Validation', status: 'SUCCESS', desc: 'Cell completeness rules scan' },
    { name: 'Mapping', status: 'SUCCESS', desc: 'Column schema data types map' },
    { name: 'Import', status: 'SUCCESS', desc: 'Execution of SQL transactions' },
    { name: 'Database Sync', status: 'SUCCESS', desc: 'Index updates & metadata sync' },
    { name: 'Dashboard Refresh', status: 'PROCESSING', desc: 'Flush BI cache structures' }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
        <div>
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-0.5 rounded">
            Ingestion & Synchronization
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight font-sans">Integrasi Data</h1>
        </div>
        
        {importTab === 'upload' && fileMeta && inferredColumns.length > 0 && (
          <button
            onClick={executeDbImport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Import ke Database
          </button>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1 text-xs font-bold text-slate-550">
        <button
          onClick={() => setImportTab('upload')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            importTab === 'upload' ? 'border-[#1D4ED8] text-[#1D4ED8]' : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UploadCloud className="h-4 w-4" /> Unggah & Sinkronisasi
        </button>
        <button
          onClick={() => setImportTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            importTab === 'history' ? 'border-[#1D4ED8] text-[#1D4ED8]' : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4" /> Riwayat Integrasi
        </button>
        <button
          onClick={() => setImportTab('pipeline')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-extrabold transition-all cursor-pointer ${
            importTab === 'pipeline' ? 'border-[#1D4ED8] text-[#1D4ED8]' : 'border-transparent hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="h-4 w-4" /> Status Pipeline Status
        </button>
      </div>

      {/* --- TAB CONTENT: FILE UPLOADER WORKFLOW --- */}
      {importTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            {!fileMeta ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 min-h-[220px] ${
                  dragActive
                    ? 'border-[#1D4ED8] bg-blue-500/5 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="p-4 rounded-full bg-blue-500/10 text-[#1D4ED8] mb-4">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Seret & lepas berkas spreadsheet</h3>
                <p className="text-[11px] text-slate-500 mt-1.5 mb-3 max-w-[200px] mx-auto">
                  Mendukung format XLSX, XLS, CSV (Maks. 50MB)
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-slate-50 cursor-pointer"
                >
                  Pilih Berkas
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 space-y-4 shadow-sm relative">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 text-[#1D4ED8] rounded-lg">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="truncate flex-1 min-w-0 pr-4">
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate" title={fileMeta.name}>{fileMeta.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">{(fileMeta.size / 1024).toFixed(2)} KB</span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-bold transition-all cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-850 text-xs">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Total Sheets</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 block">{sheetsList.length} Sheets</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Kualitas Data</span>
                    <span className={`font-extrabold mt-0.5 block ${qualityScore > 85 ? 'text-emerald-600' : 'text-amber-500'}`}>{qualityScore}% Score</span>
                  </div>
                </div>
              </div>
            )}

            {sheetsList.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-3.5">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-[#1D4ED8]" /> Lembar Kerja Terdeteksi
                </h4>
                <div className="space-y-1">
                  {sheetsList.map((sheet) => (
                    <button
                      key={sheet}
                      onClick={() => handleSheetSelect(sheet)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-all text-left cursor-pointer ${
                        selectedSheet === sheet
                          ? 'bg-blue-500/10 text-[#1D4ED8] border border-blue-500/20'
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{sheet}</span>
                      <span className="text-[10px] font-mono opacity-80">
                        {selectedSheet === sheet ? `${sheetRows.length} baris` : 'Pilih'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedSheet && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-[#1D4ED8]" /> Pengaturan Tabel Tujuan
                </h4>
                <div className="space-y-1.5 text-xs">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Nama Tabel di Database</label>
                  <input
                    type="text"
                    required
                    value={targetTableName}
                    onChange={(e) => setTargetTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                    placeholder="nama_tabel_tujuan"
                  />
                </div>
                <div className="space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Aksi Integrasi Data</label>
                  <div className="space-y-2 font-bold text-xs text-slate-700 dark:text-slate-350">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="overwrite"
                        checked={importMode === 'overwrite'}
                        onChange={() => setImportMode('overwrite')}
                        className="accent-[#1D4ED8]"
                      />
                      <span>Buat Baru / Timpa Tabel Lama</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="accent-[#1D4ED8]"
                      />
                      <span>Tambahkan ke Tabel (Append)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {generatedSql && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col h-[260px]">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Terminal className="h-4.5 w-4.5 text-[#1D4ED8]" /> SQL Schema Generated
                </h4>
                <div className="flex-1 bg-zinc-950 dark:bg-black border border-zinc-800 rounded-lg p-3 font-mono text-[9px] text-[#22C55E] overflow-y-auto leading-relaxed whitespace-pre">
                  {generatedSql}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!selectedSheet ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl min-h-[400px]">
                <FileText className="h-12 w-12 text-slate-400/55 mb-4 animate-pulse" />
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Belum ada berkas terpilih</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px] mt-2 leading-relaxed font-semibold">
                  Upload file spreadsheet temuan audit (XLSX, XLS, CSV) untuk menganalisis kolom dan memicu validasi data secara otomatis.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Settings className="h-4.5 w-4.5 text-[#1D4ED8]" /> Pemetaan Tipe Data & Kolom
                  </h3>
                  <div className="max-h-[220px] overflow-y-auto border border-slate-100 dark:border-slate-850 rounded-lg divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {inferredColumns.map((col, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/25">
                        <span className="font-bold text-slate-700 truncate max-w-xs">{idx + 1}. {col.originalName}</span>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          <input
                            type="text"
                            value={col.mappedName}
                            onChange={(e) => handleMappedNameChange(idx, e.target.value)}
                            className="border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs font-semibold focus:outline-none w-32"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => handleTypeChange(idx, e.target.value as any)}
                            className="border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
                          >
                            <option value="string">Text (VARCHAR)</option>
                            <option value="number">Numeric (FLOAT)</option>
                            <option value="boolean">Boolean</option>
                            <option value="date">Date (TIMESTAMP)</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Grid className="h-4.5 w-4.5 text-[#1D4ED8]" /> Pratinjau 5 Baris Data Teratas
                    </h3>
                  </div>
                  <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-[11px] table-fixed">
                      <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-500">
                        <tr>
                          {headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left truncate min-w-[120px] max-w-[160px]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {sheetRows.slice(0, 5).map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {headers.map((h) => (
                              <td key={h} className="px-3 py-2 truncate max-w-[160px]">{String(row[h] || '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: IMPORT HISTORY --- */}
      {importTab === 'history' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-450 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-[#1D4ED8]" /> Riwayat Integrasi Berkas Spreadsheet
          </h3>
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300 animate-fade-in">
              <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Nama Berkas</th>
                  <th className="px-4 py-3 text-left">Tanggal Impor</th>
                  <th className="px-4 py-3 text-right">Ukuran</th>
                  <th className="px-4 py-3 text-right">Total Baris</th>
                  <th className="px-4 py-3 text-center">Skor Kualitas</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-semibold">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" /> Memuat riwayat...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">HR_Employee_List_Q2.csv</td>
                      <td className="px-4 py-3 text-slate-400">2026-06-24 14:30</td>
                      <td className="px-4 py-3 text-right">8.2 MB</td>
                      <td className="px-4 py-3 text-right">4,521</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-extrabold">98%</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 border border-emerald-500/10">VALIDATED</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Budget_Allocation_FY24.xlsx</td>
                      <td className="px-4 py-3 text-slate-400">2026-06-22 09:15</td>
                      <td className="px-4 py-3 text-right">1.2 MB</td>
                      <td className="px-4 py-3 text-right">845</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-extrabold">100%</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 border border-emerald-500/10">VALIDATED</span>
                      </td>
                    </tr>
                  </>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white truncate max-w-[200px]" title={item.fileName}>{item.fileName}</td>
                      <td className="px-4 py-3 text-slate-400">{new Date(item.importTime).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{(item.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                      <td className="px-4 py-3 text-right">{item.totalRecords.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-emerald-600">{item.qualityScore}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border ${
                          item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border-emerald-500/10' : 'bg-red-100 text-red-800 border-red-500/10'
                        }`}>{item.status === 'SUCCESS' ? 'VALIDATED' : 'ERROR'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: PIPELINE STATUS --- */}
      {importTab === 'pipeline' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Success Rate</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">98.2%</h3>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg"><CheckCircle className="h-6 w-6" /></div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Failed Jobs</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">1 Job</h3>
              </div>
              <div className="p-3 bg-red-500/10 text-red-500 rounded-lg"><XCircle className="h-6 w-6" /></div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Queue Status</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">IDLE</h3>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><Cpu className="h-6 w-6" /></div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Rata-Rata Waktu</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">1.5 detik</h3>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-lg"><Clock className="h-6 w-6" /></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Tahapan Pipeline Sinkronisasi</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative py-4">
              {pipelineStages.map((stage, idx) => (
                <div key={stage.name} className="flex flex-col items-center text-center space-y-2 relative">
                  {idx < 5 && (
                    <div className="hidden md:block absolute top-4 left-1/2 translate-x-12 w-full border-t-2 border-dashed border-slate-250 dark:border-slate-800 z-0" />
                  )}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs relative z-10 ${
                    stage.status === 'SUCCESS' ? 'bg-emerald-500 text-white' : 'bg-[#1D4ED8] text-white animate-pulse'
                  }`}>{idx + 1}</div>
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-white">{stage.name}</h4>
                    <p className="text-[9px] text-slate-400 font-bold">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-[#1D4ED8]" /> Log Antrean Pipeline Integrasi
            </h3>
            <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
                <thead className="bg-slate-50 dark:bg-slate-900 font-extrabold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Job ID</th>
                    <th className="px-4 py-3 text-left">Nama Pekerjaan</th>
                    <th className="px-4 py-3 text-left">Tanggal Mulai</th>
                    <th className="px-4 py-3 text-right">Durasi</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {jobsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-bold">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" /> Memuat status aktivitas...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-450">#JOB-2026-092</td>
                        <td className="px-4 py-3 font-semibold text-slate-850 dark:text-slate-200">Ingestion: tax_revenue_fy23_final</td>
                        <td className="px-4 py-3 text-slate-400">2026-06-24 14:30:10</td>
                        <td className="px-4 py-3 text-right font-mono">1,820 ms</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-500/10">SUCCESS</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-450">#JOB-2026-089</td>
                        <td className="px-4 py-3 font-semibold text-slate-850 dark:text-slate-200">Ingestion: state_assets_inventory_v2</td>
                        <td className="px-4 py-3 text-slate-400">2026-06-20 11:20:00</td>
                        <td className="px-4 py-3 text-right font-mono">4,120 ms</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 border border-red-500/10 animate-pulse">FAILED</span>
                        </td>
                      </tr>
                    </>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-400">#JOB-{job.id}</td>
                        <td className="px-4 py-3 font-semibold text-slate-850 dark:text-slate-200 truncate max-w-[280px]" title={job.jobName}>{job.jobName}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(job.startedAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">{job.durationMs.toLocaleString()} ms</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold border ${
                            job.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border-emerald-500/10' : 'bg-red-100 text-red-800 border-red-500/10'
                          }`}>{job.status}</span>
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

    </div>
  );
}
