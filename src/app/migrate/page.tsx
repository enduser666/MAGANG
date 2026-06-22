'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDb, MySqlConfig } from '@/context/DbContext';
import { sanitizeAndFormatRow } from '@/lib/csv';
import {
  Database,
  CheckCircle,
  XCircle,
  HelpCircle,
  Play,
  ArrowRight,
  Settings,
  ShieldAlert,
  Loader2,
  ListFilter,
  Check,
  RefreshCw
} from 'lucide-react';

const DB_FIELDS = [
  { name: 'season', label: 'Season (Int)', csvDefault: 'Season' },
  { name: 'title', label: 'Episode Title (String)', csvDefault: 'EpisodeTitle' },
  { name: 'summary', label: 'About Summary (Text)', csvDefault: 'About' },
  { name: 'rating', label: 'Rating (Float)', csvDefault: 'Ratings' },
  { name: 'votes', label: 'Votes (Int)', csvDefault: 'Votes' },
  { name: 'viewership', label: 'Viewership (Float)', csvDefault: 'Viewership' },
  { name: 'duration', label: 'Duration (Int)', csvDefault: 'Duration' },
  { name: 'releaseDate', label: 'Release Date (Date)', csvDefault: 'Date' },
  { name: 'guestStars', label: 'Guest Stars (Text)', csvDefault: 'GuestStars' },
  { name: 'director', label: 'Director (String)', csvDefault: 'Director' },
  { name: 'writers', label: 'Writers (String)', csvDefault: 'Writers' },
];

export default function DbMigration() {
  const router = useRouter();
  const { dbType, dbConfig, connectionStatus, testConnection, initializeSchema, getHeaders } = useDb();

  // Wizard Steps: 1 = Connection, 2 = Schema Setup, 3 = Column Mapping, 4 = Migrate Ingestion
  const [step, setStep] = useState(1);

  // Connection Credentials form
  const [host, setHost] = useState(dbConfig?.host || '127.0.0.1');
  const [port, setPort] = useState(String(dbConfig?.port || '3306'));
  const [user, setUser] = useState(dbConfig?.user || 'root');
  const [password, setPassword] = useState(dbConfig?.password || '');
  const [database, setDatabase] = useState(dbConfig?.database || 'data_migration');
  
  const [connLoading, setConnLoading] = useState(false);
  const [connResult, setConnResult] = useState<{ success: boolean; message: string } | null>(null);

  // Schema state
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaResult, setSchemaResult] = useState<{ success: boolean; message: string } | null>(null);

  // CSV Session State
  const [csvFileName, setCsvFileName] = useState('');
  const [csvFileSize, setCsvFileSize] = useState(0);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvDuplicates, setCsvDuplicates] = useState(0);
  const [csvMissing, setCsvMissing] = useState(0);

  // Mappings state
  const [headersList, setHeadersList] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Migration Execution State
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [migratedCount, setMigratedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'success' | 'partial' | 'failed'>('idle');
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);

  // Load uploaded CSV data from sessionStorage
  useEffect(() => {
    const savedName = sessionStorage.getItem('migratable_csv_name');
    const savedSize = sessionStorage.getItem('migratable_csv_size');
    const savedRowsStr = sessionStorage.getItem('migratable_csv_rows');
    const savedDups = sessionStorage.getItem('migratable_csv_duplicates');
    const savedMissing = sessionStorage.getItem('migratable_csv_missing');

    if (savedName && savedRowsStr) {
      setCsvFileName(savedName);
      setCsvFileSize(Number(savedSize || 0));
      const parsedRows = JSON.parse(savedRowsStr);
      setCsvRows(parsedRows);
      setCsvDuplicates(Number(savedDups || 0));
      setCsvMissing(Number(savedMissing || 0));

      if (parsedRows.length > 0) {
        // Collect header keys
        const cols = Object.keys(parsedRows[0]);
        setHeadersList(cols);

        // Auto-match mappings based on case-insensitive matches
        const autoMappings: Record<string, string> = {};
        DB_FIELDS.forEach((field) => {
          const matched = cols.find(
            (c) => c.toLowerCase() === field.csvDefault.toLowerCase() || c.toLowerCase() === field.name.toLowerCase()
          );
          autoMappings[field.name] = matched || '';
        });
        setMappings(autoMappings);
      }
    }
  }, []);

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnLoading(true);
    setConnResult(null);

    const config: MySqlConfig = {
      host,
      port: parseInt(port, 10) || 3306,
      user,
      password: password || undefined,
      database
    };

    const res = await testConnection(config);
    setConnResult(res);
    setConnLoading(false);
    
    if (res.success) {
      setTimeout(() => {
        setStep(2);
      }, 1000);
    }
  };

  const handleInitializeSchema = async () => {
    setSchemaLoading(true);
    setSchemaResult(null);
    const res = await initializeSchema();
    setSchemaResult(res);
    setSchemaLoading(false);

    if (res.success) {
      setTimeout(() => {
        setStep(3);
      }, 1000);
    }
  };

  const handleFieldMappingChange = (fieldName: string, csvHeader: string) => {
    setMappings((prev) => ({ ...prev, [fieldName]: csvHeader }));
  };

  const handleExecuteMigration = async () => {
    if (csvRows.length === 0) return;
    
    setMigrating(true);
    setMigrationStatus('running');
    setProgress(0);
    setMigratedCount(0);
    setFailedCount(0);
    setMigrationLogs([]);

    const addLog = (msg: string) => {
      setMigrationLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    addLog(`Initiating batch ingestion. Total records to migrate: ${csvRows.length}.`);

    // Split rows into batches of 50
    const chunkSize = 50;
    const chunks: any[][] = [];
    for (let i = 0; i < csvRows.length; i += chunkSize) {
      chunks.push(csvRows.slice(i, i + chunkSize));
    }

    let successAccumulator = 0;
    let failedAccumulator = 0;

    const headers = getHeaders();

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      addLog(`Sending batch ${chunkIndex + 1} of ${chunks.length} (${chunk.length} records)...`);

      // Format records using mapping dropdown choices
      const formattedRecords = chunk.map((row) => {
        const mappedRow: any = {};
        DB_FIELDS.forEach((field) => {
          const csvCol = mappings[field.name];
          mappedRow[field.name] = csvCol ? row[csvCol] : '';
        });
        return sanitizeAndFormatRow(mappedRow as any);
      });

      try {
        const res = await fetch('/api/db/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            action: 'migrate',
            records: formattedRecords,
            fileName: csvFileName,
            fileSize: csvFileSize,
            duplicatesCount: csvDuplicates,
            missingValuesCount: csvMissing,
          }),
        });

        const data = await res.json();
        if (data.success) {
          successAccumulator += data.migrated || 0;
          failedAccumulator += data.failed || 0;
          setMigratedCount(successAccumulator);
          setFailedCount(failedAccumulator);
          addLog(`Batch ${chunkIndex + 1} complete: ${data.migrated} migrated successfully, ${data.failed} failed.`);
        } else {
          failedAccumulator += chunk.length;
          setFailedCount(failedAccumulator);
          addLog(`Batch ${chunkIndex + 1} failed! Server message: ${data.message || 'unknown error'}`);
        }
      } catch (err: any) {
        failedAccumulator += chunk.length;
        setFailedCount(failedAccumulator);
        addLog(`Network error in Batch ${chunkIndex + 1}: ${err.message}`);
      }

      const percentage = Math.round(((chunkIndex + 1) / chunks.length) * 100);
      setProgress(percentage);
    }

    setMigrating(false);
    const finalStatus = failedAccumulator === 0 ? 'success' : successAccumulator > 0 ? 'partial' : 'failed';
    setMigrationStatus(finalStatus);
    addLog(`Migration complete. Success: ${successAccumulator}, Failures: ${failedAccumulator}. Status: ${finalStatus.toUpperCase()}.`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Database Migration Module</h1>
        <p className="text-sm text-muted-foreground">Manage database schema mappings and stream spreadsheet records into MySQL tables.</p>
      </div>

      {/* Stepper Wizard Header */}
      <div className="border border-border bg-card rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Migration Wizard Pipeline:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold">
            {/* Step 1 */}
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${step === 1 ? 'border-primary bg-primary/10' : step > 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                {step > 1 ? <Check className="h-3 w-3" /> : 1}
              </span>
              <span>DB Connection</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />

            {/* Step 2 */}
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${step === 2 ? 'border-primary bg-primary/10' : step > 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                {step > 2 ? <Check className="h-3 w-3" /> : 2}
              </span>
              <span>Schema Verify</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />

            {/* Step 3 */}
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${step === 3 ? 'border-primary bg-primary/10' : step > 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                {step > 3 ? <Check className="h-3 w-3" /> : 3}
              </span>
              <span>Field Map</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground hidden sm:block" />

            {/* Step 4 */}
            <div className={`flex items-center gap-2 ${step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
              <span className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${step === 4 ? 'border-primary bg-primary/10' : 'border-border'}`}>
                4
              </span>
              <span>Run Migration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Wizard Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side (Steps 1-3) Forms and mappings */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: Connect to Database */}
          {step === 1 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Step 1: Database Connection Setup</h3>
              </div>

              {dbType === 'sandbox' ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-4 text-sm text-purple-700 dark:text-purple-300 flex items-start gap-3">
                    <Database className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold block">Sandbox Database is Active</span>
                      No server setup or credentials required. SQLite and JSON simulation mode will process all table setups and mappings automatically.
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
                  >
                    Proceed with Sandbox <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleTestConnection} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Host Address</label>
                      <input
                        type="text"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Port</label>
                      <input
                        type="text"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Database User</label>
                      <input
                        type="text"
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-muted-foreground">Password</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-muted-foreground">Database Name</label>
                      <input
                        type="text"
                        value={database}
                        onChange={(e) => setDatabase(e.target.value)}
                        required
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {connResult && (
                    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      connResult.success 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-450' 
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                    }`}>
                      {connResult.success ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                      <span>{connResult.message}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={connLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
                  >
                    {connLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test & Save Connection
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 2: Database Schema / Table Generation */}
          {step === 2 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Step 2: Database Schema Tables Validation</h3>
              </div>

              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  We need to ensure that the relational database tables (`Episode`, `ImportHistory`, `AuditLog`) are created and structured correctly inside your database.
                </p>

                {dbType === 'mysql' && (
                  <div className="border border-border rounded-lg p-3 bg-muted/40 font-mono text-[10px] text-foreground">
                    <span className="font-semibold block mb-1">Target Engine: InnoDB UTF8MB4</span>
                    - Table: Episode (id, season, title, summary, rating, votes, viewership, duration, releaseDate, guestStars, director, writers, createdAt)<br/>
                    - Table: ImportHistory (id, fileName, fileSize, status, totalRecords, migratedRecords, failedRecords, duplicatesCount, missingValuesCount)<br/>
                    - Table: AuditLog (id, timestamp, action, details, user)
                  </div>
                )}

                {schemaResult && (
                  <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                    schemaResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                  }`}>
                    {schemaResult.success ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                    <span>{schemaResult.message}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleInitializeSchema}
                    disabled={schemaLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
                  >
                    {schemaLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Verify & Create Tables
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Mapping CSV columns to fields */}
          {step === 3 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListFilter className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">Step 3: CSV Column Field Mapper</h3>
                </div>
                {csvRows.length > 0 && (
                  <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded px-2.5 py-1 border border-emerald-500/20">
                    File Loaded: {csvFileName}
                  </span>
                )}
              </div>

              {csvRows.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-xl bg-muted/10 space-y-4">
                  <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No spreadsheet data found in memory.</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Please upload and audit your series CSV file first in the Data Import module.
                    </p>
                  </div>
                  <Link
                    href="/import"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
                  >
                    Go Upload CSV
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Define the mapping rules. Align database schema fields to columns in your uploaded CSV. Fields have been auto-matched based on label names.
                  </p>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-border text-xs">
                      <thead className="bg-muted/40 font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Database Table Field</th>
                          <th className="px-4 py-2.5 text-left">Mapped CSV Column</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-foreground bg-card">
                        {DB_FIELDS.map((field) => {
                          const currentMap = mappings[field.name];
                          const isMapped = !!currentMap;
                          return (
                            <tr key={field.name} className="hover:bg-muted/10">
                              <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-350">{field.label}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={currentMap}
                                  onChange={(e) => handleFieldMappingChange(field.name, e.target.value)}
                                  className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none"
                                >
                                  <option value="">-- Do Not Map / Null --</option>
                                  {headersList.map((header) => (
                                    <option key={header} value={header}>
                                      {header}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {isMapped ? (
                                  <span className="text-emerald-500 font-bold">✓ Mapped</span>
                                ) : (
                                  <span className="text-muted-foreground italic">Null</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setStep(4)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 transition-all"
                    >
                      Configure Migration Ingestion <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Ingestion Run / Progress bar */}
          {step === 4 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg text-foreground">Step 4: Execute Migration Process</h3>
              </div>

              <div className="space-y-6">
                {migrationStatus === 'idle' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                      <h4 className="font-bold text-sm text-foreground">Ready to Ingest Data</h4>
                      <p className="text-xs text-muted-foreground">
                        Press execute to begin batch inserts. Records will parse and migrate using your defined schema mappings. Connection mode: <span className="font-bold uppercase">{dbType}</span>.
                      </p>
                      <div className="text-xs font-mono bg-background/50 border border-border rounded p-3 text-muted-foreground space-y-1">
                        <div>• Ingest File: {csvFileName}</div>
                        <div>• Records to Load: {csvRows.length} items</div>
                        <div>• Data Target: {dbType === 'mysql' ? `${dbConfig?.host}/${dbConfig?.database}` : 'sandbox_db.json'}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleExecuteMigration}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all"
                      >
                        <Play className="h-4 w-4 fill-primary-foreground" />
                        Execute Migration Ingestion
                      </button>
                      <button
                        onClick={() => setStep(3)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Indicators */}
                {migrationStatus !== 'idle' && (
                  <div className="space-y-6">
                    {/* Status Badge */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-foreground">
                        {migrationStatus === 'running' && 'Ingesting Spreadsheet Chunks...'}
                        {migrationStatus === 'success' && 'Migration Completed Successfully!'}
                        {migrationStatus === 'partial' && 'Migration Completed with Warnings'}
                        {migrationStatus === 'failed' && 'Migration Failed!'}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary">{progress}%</span>
                    </div>

                    {/* Progress Bar container */}
                    <div className="w-full bg-muted rounded-full h-3 border border-border overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          migrationStatus === 'success' 
                            ? 'bg-emerald-500' 
                            : migrationStatus === 'partial' 
                            ? 'bg-amber-500' 
                            : migrationStatus === 'failed' 
                            ? 'bg-rose-500' 
                            : 'bg-primary'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Quality statistics counters */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-muted/40 p-4 border border-border rounded-xl text-center">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Total Records</span>
                        <span className="text-xl font-extrabold text-foreground">{csvRows.length}</span>
                      </div>
                      <div className="bg-emerald-500/5 p-4 border border-emerald-500/10 rounded-xl text-center">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase block">Ingested</span>
                        <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{migratedCount}</span>
                      </div>
                      <div className="bg-rose-500/5 p-4 border border-rose-500/10 rounded-xl text-center">
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase block">Failed</span>
                        <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{failedCount}</span>
                      </div>
                    </div>

                    {/* Success Message Banner */}
                    {migrationStatus === 'success' && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold block">Audited & Migrated</span>
                          All records passed column mappings and datatype validation. The MySQL database tables have been successfully populated.
                          <div className="mt-3 flex gap-3">
                            <Link href="/" className="inline-flex items-center gap-1 font-bold text-xs hover:underline">
                              Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <Link href="/explorer" className="inline-flex items-center gap-1 font-bold text-xs hover:underline">
                              Explore Records <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Terminal execution log console */}
                    <div className="flex flex-col h-[200px]">
                      <span className="text-xs font-semibold text-muted-foreground mb-2">Ingestion Output Feed:</span>
                      <div className="flex-1 bg-zinc-950 dark:bg-black border border-zinc-800 rounded-lg p-3 font-mono text-[9px] text-zinc-400 overflow-y-auto space-y-1">
                        {migrationLogs.map((log, idx) => (
                          <div key={idx} className="leading-relaxed">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Quick info guide */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <HelpCircle className="h-4.5 w-4.5 text-primary" /> Migration Help Desk
            </h3>
            <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
              <div className="space-y-1.5">
                <span className="font-bold text-foreground block">Dynamic Settings</span>
                <p>
                  You can configure and switch target connections on the fly. All operations execute inside client-triggered server-side actions, avoiding persistent server-side connection locks.
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="font-bold text-foreground block">Verification Step</span>
                <p>
                  We run dynamic table setup checks. If database tables are missing, the setup scripts will build standard InnoDB structures and configure relational fields automatically.
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="font-bold text-foreground block">Column Mapping rules</span>
                <p>
                  Allows you to define mapping parameters. Empty mapping blocks will default to Null entries in the database, avoiding strict database block errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
