import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { BaseWidgetProps } from './KPICard';

export function PieChartWidget({ config, data }: BaseWidgetProps) {
  const chartData = Array.isArray(data) ? data : [];
  const xAxisKey = config.chart?.xAxis || 'name';
  const yAxisKey = config.chart?.yAxis || '_count';
  const colors = ['#1D4ED8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs flex flex-col justify-between">
      <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-2">{config.title || 'Pie Chart'}</h4>
      <div className="h-[180px] relative flex items-center justify-center">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey={yAxisKey} nameKey={xAxisKey}>
                {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-[10px] text-slate-400">Tidak ada data</div>
        )}
      </div>
    </div>
  );
}
