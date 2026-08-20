import React from 'react';
import { WidgetConfig } from '@/lib/metadata-contract';

export interface BaseWidgetProps {
  config: WidgetConfig;
  data: any;
}

export function KPICard({ config, data }: BaseWidgetProps) {
  const value = typeof data === 'number' ? data.toLocaleString('id-ID') : data;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-xs">
      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">{config.title || 'KPI'}</span>
      <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{value}</p>
      {config.description && (
        <span className="text-[9px] text-slate-400 font-bold block mt-1">{config.description}</span>
      )}
    </div>
  );
}
