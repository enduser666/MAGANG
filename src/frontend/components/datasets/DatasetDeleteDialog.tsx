import React, { useState } from 'react';

interface DatasetDeleteDialogProps {
  isOpen: boolean;
  datasetName: string;
  recordIdentifier: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DatasetDeleteDialog: React.FC<DatasetDeleteDialogProps> = ({
  isOpen,
  datasetName,
  recordIdentifier,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <svg className="w-6 h-6 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-2">
            Hapus Data?
          </h3>
          <p className="text-sm text-center text-slate-500 dark:text-slate-400">
            Anda yakin ingin menghapus data <strong>{recordIdentifier}</strong> dari dataset <strong>{datasetName}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Hapus Data
          </button>
        </div>

      </div>
    </div>
  );
};
