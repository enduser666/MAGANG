import React from 'react';
import { BaseWidgetProps } from './KPICard';

export function TableWidget({ config, data }: BaseWidgetProps) {
  const tableData = Array.isArray(data) ? data : [];
  const columns = config.table?.columns || (tableData.length > 0 ? Object.keys(tableData[0]).filter(k => k !== 'id') : []);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-5 shadow-xs overflow-hidden">
      <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider mb-4">{config.title || 'Table Preview'}</h4>
      <div className="overflow-x-auto text-[10px]">
        {tableData.length > 0 ? (
          <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-550 font-bold">
              <tr>
                {columns.map(col => (
                  <th key={col} className="px-3 py-2 text-left uppercase">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tableData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  {columns.map(col => (
                    <td key={col} className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-slate-400 py-4">Tidak ada data</div>
        )}
      </div>
    </div>
  );
}
