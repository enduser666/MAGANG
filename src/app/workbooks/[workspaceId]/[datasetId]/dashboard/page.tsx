'use client';

import React, { useState, useEffect } from 'react';
import { useDb } from '@/providers/DbContext';
import { LayoutDashboard, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { WidgetRenderer } from '@/frontend/components/widgets/WidgetRenderer';
import { WidgetPayload } from '@/runtime/DashboardRuntime';
import { DashboardMetadata } from '@/backend/lib/metadata-contract';
import { useRouter } from 'next/navigation';

export default function DynamicDashboardPage({ params }: { params: Promise<{ workspaceId: string; datasetId: string }> }) {
  const resolvedParams = React.use(params);
  const { dbType, getHeaders, connectionStatus } = useDb();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardMetadata | null>(null);
  const [payloads, setPayloads] = useState<WidgetPayload[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/workbooks/${resolvedParams.workspaceId}/${resolvedParams.datasetId}/dashboard`, {
          headers: getHeaders()
        });
        const json = await res.json();
        
        if (!json.success) {
          throw new Error(json.message || 'Failed to load dashboard');
        }

        setDashboard(json.data.dashboard);
        setPayloads(json.data.widgets);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (dbType === 'sandbox' || connectionStatus === 'connected') {
      loadDashboard();
    }
  }, [resolvedParams.workspaceId, resolvedParams.datasetId, dbType, connectionStatus]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-sm font-semibold text-slate-500">Menyusun Visualisasi Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Gagal Memuat Dashboard</h3>
        <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-6">{error}</p>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Dataset
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-850 pb-4">
        <div>
          <button 
            onClick={() => router.push(`/workbooks/${resolvedParams.workspaceId}/${resolvedParams.datasetId}`)}
            className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold tracking-widest text-[#1D4ED8] bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors mb-2 cursor-pointer w-fit"
          >
            <ArrowLeft className="h-3 w-3" /> Tabel Dataset
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-600" />
            {dashboard?.title || 'Dynamic Dashboard'}
          </h1>
          {dashboard?.description && (
            <p className="text-sm text-slate-500 font-medium mt-1">{dashboard.description}</p>
          )}
        </div>
      </div>

      {/* Widget Renderer */}
      <WidgetRenderer payloads={payloads} />
    </div>
  );
}
