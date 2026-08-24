import React, { useState, useEffect } from 'react';
import { ColumnMetadata } from '@/backend/lib/metadata-contract';
import { DynamicDatasetForm } from './DynamicDatasetForm';

interface DatasetFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'update';
  datasetName: string;
  columns: ColumnMetadata[];
  initialData?: Record<string, any>;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export const DatasetFormModal: React.FC<DatasetFormModalProps> = ({
  isOpen,
  mode,
  datasetName,
  columns,
  initialData,
  onClose,
  onSubmit
}) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValues(initialData || {});
      setErrors({});
      setGlobalError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };

  const validate = (): boolean => {
    const newErrs: Record<string, string> = {};
    for (const col of columns) {
      const val = values[col.name];
      if (col.validation?.isRequired && (!col.isPrimaryKey || mode === 'create') && (val === undefined || val === null || val === '')) {
        newErrs[col.name] = `${col.displayName || col.name} is required.`;
      }
    }
    setErrors(newErrs);
    return Object.keys(newErrs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      setGlobalError(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-xl">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {mode === 'create' ? 'Tambah Data' : 'Edit Data'} - {datasetName}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {globalError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 text-sm">
              {globalError}
            </div>
          )}
          
          <form id="dataset-form" onSubmit={handleSubmit}>
            <DynamicDatasetForm
              columns={columns}
              values={values}
              errors={errors}
              onChange={handleChange}
              mode={mode}
            />
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 sticky bottom-0 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="dataset-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting && (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Simpan Data
          </button>
        </div>

      </div>
    </div>
  );
};
