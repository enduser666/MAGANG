import React from 'react';
import { WIDGET_REGISTRY } from './WidgetRegistry';
import { WidgetPayload } from '@/runtime/DashboardRuntime';

interface WidgetRendererProps {
  payloads: WidgetPayload[];
}

export function WidgetRenderer({ payloads }: WidgetRendererProps) {
  if (!payloads || payloads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#111827]">
        <p className="text-sm font-semibold">Tidak ada widget yang dikonfigurasi untuk dashboard ini.</p>
      </div>
    );
  }

  // Group payloads by type roughly for auto-layout if layout not specified
  const kpis = payloads.filter(p => p.config.type === 'kpi' || p.config.type === 'statistic');
  const charts = payloads.filter(p => ['bar', 'line', 'pie'].includes(p.config.type));
  const tables = payloads.filter(p => p.config.type === 'table');
  const others = payloads.filter(p => !['kpi', 'statistic', 'bar', 'line', 'pie', 'table'].includes(p.config.type));

  const renderWidget = (p: WidgetPayload) => {
    const Component = WIDGET_REGISTRY[p.config.type];
    if (!Component) {
      return (
        <div key={p.config.id} className="p-4 bg-red-50 text-red-500 rounded border border-red-200 text-xs">
          Widget type "{p.config.type}" unsupported.
        </div>
      );
    }
    return <Component key={p.config.id} config={p.config} data={p.data} />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPIs row */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(renderWidget)}
        </div>
      )}

      {/* Charts row */}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {charts.map(renderWidget)}
        </div>
      )}

      {/* Tables row */}
      {tables.length > 0 && (
        <div className="space-y-6">
          {tables.map(renderWidget)}
        </div>
      )}

      {/* Others */}
      {others.length > 0 && (
        <div className="space-y-6">
          {others.map(renderWidget)}
        </div>
      )}
    </div>
  );
}
