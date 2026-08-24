import React from 'react';
import { AlertCircle, FileSearch, Loader2 } from 'lucide-react';

export const DatasetLoadingState = () => (
  <div className="flex flex-col items-center justify-center p-12 text-slate-500">
    <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
    <p className="text-sm font-medium">Memuat dataset...</p>
  </div>
);

export const DatasetEmptyState = ({ title = 'Data Kosong', message = 'Belum ada data pada dataset ini.' }: { title?: string, message?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-slate-800 border-dashed m-4">
    <FileSearch className="h-10 w-10 mb-3 text-slate-400" />
    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
    <p className="text-xs text-center">{message}</p>
  </div>
);

export const DatasetErrorState = ({ title = 'Terjadi Kesalahan', message, code }: { title?: string, message: string, code?: number }) => (
  <div className="flex flex-col items-center justify-center p-12 m-4 bg-rose-50/50 dark:bg-rose-900/10 rounded-lg border border-rose-200 dark:border-rose-900/50">
    <AlertCircle className="h-10 w-10 mb-3 text-rose-500" />
    <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 mb-1">
      {code ? `${code} - ${title}` : title}
    </h3>
    <p className="text-xs text-rose-600 dark:text-rose-500 text-center max-w-md">{message}</p>
  </div>
);
