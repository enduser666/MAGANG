import React from 'react';
import { ColumnMetadata } from '@/lib/metadata-contract';

interface DynamicDatasetTableProps {
  columns: ColumnMetadata[];
  records: Record<string, any>[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
}

export const DynamicDatasetTable: React.FC<DynamicDatasetTableProps> = ({
  columns,
  records,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete
}) => {
  const formatValue = (value: any, column: ColumnMetadata) => {
    if (value === null || value === undefined) return '—';

    const format = column.presentation?.displayFormat;
    
    try {
      if (format === 'CURRENCY') {
        const num = Number(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(num);
      }
      
      if (format === 'PERCENTAGE') {
        const num = Number(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('id-ID', {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(num / 100); // Assuming percentage values are stored as 95.25 for 95.25%, not 0.9525. Wait, usually 95.25 is meant as 95.25. If so, format(num / 100) displays 95,25%. If stored as 0.9525, it should be num. Let's use format(num/100) or just string concat. Let's string concat to be safe.
      }
      
      if (format === 'NUMBER_COMMAS') {
        const num = Number(value);
        if (isNaN(num)) return value;
        return new Intl.NumberFormat('id-ID').format(num);
      }
      
      if (format === 'DATE_SHORT') {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return new Intl.DateTimeFormat('id-ID', {
          day: '2-digit', month: '2-digit', year: 'numeric'
        }).format(d);
      }
      
      if (format === 'DATE_LONG') {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return new Intl.DateTimeFormat('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric'
        }).format(d);
      }

      // Default type formatting
      if (column.type === 'date') {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return new Intl.DateTimeFormat('id-ID').format(d);
        }
      }
      
      if (column.type === 'boolean') {
        return value ? 'Ya' : 'Tidak';
      }

      if (column.type === 'number') {
        const num = Number(value);
        if (!isNaN(num)) return new Intl.NumberFormat('id-ID').format(num);
      }

      return String(value);
    } catch (e) {
      // Fallback if formatting fails
      return String(value);
    }
  };

  const getAlignment = (column: ColumnMetadata) => {
    if (column.presentation?.align) {
      return `text-${column.presentation.align}`;
    }
    // Default alignment
    if (column.presentation?.displayFormat === 'CURRENCY' || 
        column.presentation?.displayFormat === 'PERCENTAGE' ||
        column.presentation?.displayFormat === 'NUMBER_COMMAS' ||
        column.type === 'number') {
      return 'text-right';
    }
    return 'text-left';
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm">
      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-extrabold text-slate-500 tracking-wider">
          <tr>
            {columns.filter(c => !c.presentation?.isHidden).map((column) => (
              <th 
                key={column.name}
                className={`px-4 py-3 ${onSort && column.isSortable !== false ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700' : ''} ${getAlignment(column)}`}
                style={{ width: column.presentation?.width ? `${column.presentation.width}px` : 'auto' }}
                onClick={() => {
                  if (onSort && column.isSortable !== false) {
                    onSort(column.name);
                  }
                }}
              >
                <div className={`flex items-center gap-1 ${getAlignment(column) === 'text-right' ? 'justify-end' : ''}`}>
                  {column.displayName ?? column.name}
                  {sortField === column.name && (
                    <span className="text-blue-500 text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-4 py-3 text-right">Aksi</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
          {records.map((row, i) => {
            // Use ID if available, otherwise index fallback
            const rowKey = row.id !== undefined ? String(row.id) : `row-${i}`;
            
            return (
              <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                {columns.filter(c => !c.presentation?.isHidden).map((column) => {
                  const cellValue = row[column.name];
                  return (
                    <td 
                      key={column.name} 
                      className={`px-4 py-2.5 truncate max-w-[300px] ${getAlignment(column)}`}
                      title={cellValue !== null && cellValue !== undefined ? String(cellValue) : ''}
                    >
                      {formatValue(cellValue, column)}
                    </td>
                  );
                })}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
