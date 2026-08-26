import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';
import { BaseWidgetProps } from './KPICard';

export function LineChartWidget({ config, data }: BaseWidgetProps) {
  const chartData = Array.isArray(data) ? data : [];
  const xAxisKey = config.chart?.xAxis || 'name';
  const yAxisKey = config.chart?.yAxis || '_count';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs">
      <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">{config.title || 'Line Chart'}</h4>
      <div className="h-[260px] text-[10px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis dataKey={xAxisKey} stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip />
              <Line type="monotone" dataKey={yAxisKey} stroke="#1D4ED8" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">Tidak ada data (kosong atau diblokir)</div>
        )}
      </div>
    </div>
  );
}
