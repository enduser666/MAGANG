import { ColumnDefinition, TableMetadata, QueryParams } from './types';

export const COLLABORATION_COLUMNS: ColumnDefinition[] = [
  { name: 'owner_username', type: 'string', isNullable: true },
  { name: 'created_by', type: 'string', isNullable: true },
  { name: 'updated_by', type: 'string', isNullable: true },
  { name: 'created_at', type: 'date', isNullable: true },
  { name: 'updated_at', type: 'date', isNullable: true },
  { name: 'workflow_status', type: 'string', isNullable: true },
  { name: 'record_version', type: 'number', isNullable: true },
  { name: 'locked_by', type: 'string', isNullable: true },
  { name: 'locked_until', type: 'date', isNullable: true },
  { name: 'approval_status', type: 'string', isNullable: true },
  { name: 'approval_history', type: 'string', isNullable: true },
  { name: 'activity_ref', type: 'string', isNullable: true }
];

export function ensureCollaborationColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  const extended = [...columns];
  for (const col of COLLABORATION_COLUMNS) {
    if (!extended.some(c => c.name.toLowerCase() === col.name.toLowerCase())) {
      extended.push(col);
    }
  }
  return extended;
}

export const HIDDEN_COLLABORATION_COLUMNS = new Set(
  COLLABORATION_COLUMNS.map(c => c.name.toLowerCase())
);

export function filterCollaborationColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return (columns || []).filter(
    column => !HIDDEN_COLLABORATION_COLUMNS.has(column.name.toLowerCase())
  );
}

export function injectCollaborationDefaults(row: any, creator: string): any {
  const now = new Date().toISOString();
  return {
    owner_username: creator || 'admin',
    created_by: creator || 'admin',
    updated_by: creator || 'admin',
    created_at: now,
    updated_at: now,
    workflow_status: 'Draft',
    record_version: 1,
    locked_by: null,
    locked_until: null,
    approval_status: 'DRAFT',
    approval_history: '[]',
    activity_ref: null,
    ...row
  };
}
