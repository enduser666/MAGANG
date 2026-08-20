import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { BaseWidgetProps } from './KPICard';

export function BarChartWidget({ config, data }: BaseWidgetProps) {
  const chartData = Array.isArray(data) ? data : [];
  const xAxisKey = config.chart?.xAxis || 'name';
  const yAxisKey = config.chart?.yAxis || '_count';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
      <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">{config.title || 'Bar Chart'}</h4>
      <div className="h-60 text-[10px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis dataKey={xAxisKey} stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip />
              <Bar dataKey={yAxisKey} fill="#1D4ED8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">Tidak ada data (kosong atau diblokir)</div>
        )}
      </div>
    </div>
  );
}
