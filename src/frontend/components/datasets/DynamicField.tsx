import React from 'react';
import { ColumnMetadata } from '@/backend/lib/metadata-contract';

interface DynamicFieldProps {
  column: ColumnMetadata;
  value: any;
  onChange: (name: string, value: any) => void;
  error?: string;
  isUpdate?: boolean;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({ column, value, onChange, error, isUpdate }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let val: any = e.target.value;
    if (column.type === 'number') {
      val = val === '' ? '' : Number(val);
    }
    onChange(column.name, val);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(column.name, e.target.checked);
  };

  const isReadOnly = (column.isPrimaryKey && isUpdate) || column.isEditable === false;

  const baseClassName = "mt-1 block w-full rounded-md border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border";
  const errorClassName = error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "";
  const readOnlyClassName = isReadOnly ? "bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed" : "";

  const renderInput = () => {
    if (column.options && column.options.length > 0) {
      return (
        <select
          id={column.name}
          name={column.name}
          value={value ?? ''}
          onChange={handleChange}
          disabled={isReadOnly}
          className={`${baseClassName} ${errorClassName} ${readOnlyClassName}`}
          required={column.validation?.isRequired}
        >
          <option value="" disabled>Pilih {column.displayName || column.name}</option>
          {column.options.map(opt => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (column.type === 'boolean') {
      return (
        <div className="flex items-center mt-2">
          <input
            type="checkbox"
            id={column.name}
            name={column.name}
            checked={!!value}
            onChange={handleCheckboxChange}
            disabled={isReadOnly}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor={column.name} className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
            {column.displayName || column.name}
          </label>
        </div>
      );
    }

    if (column.type === 'date') {
      return (
        <input
          type="date"
          id={column.name}
          name={column.name}
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={handleChange}
          disabled={isReadOnly}
          required={column.validation?.isRequired}
          className={`${baseClassName} ${errorClassName} ${readOnlyClassName}`}
        />
      );
    }

    if (column.type === 'number') {
      return (
        <input
          type="number"
          id={column.name}
          name={column.name}
          value={value ?? ''}
          onChange={handleChange}
          disabled={isReadOnly}
          min={column.validation?.min}
          max={column.validation?.max}
          required={column.validation?.isRequired}
          className={`${baseClassName} ${errorClassName} ${readOnlyClassName}`}
        />
      );
    }

    // Default String
    return (
      <input
        type={column.presentation?.inputType || 'text'}
        id={column.name}
        name={column.name}
        value={value ?? ''}
        onChange={handleChange}
        disabled={isReadOnly}
        pattern={column.validation?.regexPattern}
        required={column.validation?.isRequired}
        placeholder={column.presentation?.placeholder || `Masukkan ${column.displayName || column.name}`}
        className={`${baseClassName} ${errorClassName} ${readOnlyClassName}`}
      />
    );
  };

  return (
    <div className="mb-4">
      {column.type !== 'boolean' && (
        <label htmlFor={column.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {column.displayName || column.name}
          {column.validation?.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
