import React from 'react';
import { ColumnMetadata } from '@/backend/lib/metadata-contract';
import { DynamicField } from './DynamicField';

interface DynamicDatasetFormProps {
  columns: ColumnMetadata[];
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (name: string, value: any) => void;
  mode: 'create' | 'update';
}

export const DynamicDatasetForm: React.FC<DynamicDatasetFormProps> = ({ columns, values, errors, onChange, mode }) => {
  return (
    <div className="space-y-4">
      {columns
        .filter(column => !column.presentation?.isHidden)
        // Primary keys are read-only on update, usually we might hide them on create if they are auto-increment.
        // For simplicity, we just render them based on isHidden and let DynamicField handle readOnly state.
        .map(column => (
          <DynamicField
            key={column.name}
            column={column}
            value={values[column.name]}
            onChange={onChange}
            error={errors[column.name]}
            isUpdate={mode === 'update'}
          />
        ))}
    </div>
  );
};
