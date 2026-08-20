/**
 * SIDATA Runtime Metadata Contract
 * Single source of truth for dynamic datasets, grids, forms, search, and analytics.
 */

export interface PresentationMetadata {
  width?: number;
  align?: 'left' | 'center' | 'right';
  isHidden?: boolean;
  displayFormat?: 'CURRENCY' | 'PERCENTAGE' | 'DATE_LONG' | 'DATE_SHORT' | 'NUMBER_COMMAS' | 'TEXT';
  icon?: string;
  lookupSource?: string;         // Name of physical lookup table (e.g. "ctrl_status")
  lookupColumn?: string;         // Value field in lookup table (e.g. "kode_status")
  lookupDisplayColumn?: string;  // Label field in lookup table (e.g. "nama_status")
  placeholder?: string;
  inputType?: string;
}

export interface ValidationMetadata {
  isRequired?: boolean;
  min?: number;
  max?: number;
  regexPattern?: string;
  validationErrorText?: string;
}

export interface AnalyticsMetadata {
  isMetric?: boolean;            // Can be aggregated (e.g., sums, averages)
  isDimension?: boolean;         // Can group values (e.g., status, unit_kerja)
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  chartType?: 'BAR' | 'LINE' | 'PIE' | 'AREA';
}

export interface ColumnMetadata {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  isSearchable?: boolean;
  isSortable?: boolean;
  isEditable?: boolean;
  presentation: PresentationMetadata;
  validation: ValidationMetadata;
  analytics: AnalyticsMetadata;
  options?: { label: string; value: string | number }[];
}

export interface RelationshipMetadata {
  id?: number;
  sourceColumn: string;
  targetDataset: string;         // target dynamic table name (e.g. "temuan_pengawasan")
  targetColumn: string;          // target key column (e.g. "nomor_lhp")
  relationType: 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'ONE_TO_ONE';
}

export interface PermissionMetadata {
  role: 'Administrator' | 'Auditor' | 'Viewer';
  actions: ('CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'IMPORT')[];
  columnMasks?: string[];        // List of column names hidden or masked for this role
  rowFilterQuery?: string;       // SQL WHERE condition or Sandbox filter criteria for RLS (e.g. "kode_satker = '01'")
}

export interface ViewMetadata {
  id: string;
  datasetId: string;
  name: string;
  filterQuery?: Record<string, any>; // Saved search filter parameters
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  pageLimit?: number;
}

export interface DatasetMetadata {
  id: string;                    // Logical dataset identifier
  workspaceId: string;           // Workspace scoping
  canonicalName: string;         // Dynamic table name (e.g. "temuan_pengawasan")
  displayName: string;           // Human readable dataset name
  physicalTable: string;         // Target PostgreSQL/Sandbox table name
  category: 'MASTER' | 'TRANSACTION' | 'LOOKUP' | 'CONFIG';
  rowCount: number;
  qualityScore: number;
  columns: ColumnMetadata[];
  relationships: RelationshipMetadata[];
  permissions: PermissionMetadata[];
}

export type WidgetType = 'kpi' | 'statistic' | 'line' | 'bar' | 'pie' | 'table' | 'markdown' | 'richtext';

export interface WidgetConfig {
  id: string;
  dashboardId: string;
  type: WidgetType;
  title?: string;
  description?: string;
  datasetId?: string;
  aggregate?: {
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
  };
  chart?: {
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
  };
  table?: {
    limit?: number;
    columns?: string[];
  };
  content?: string;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface DashboardMetadata {
  id: string;
  title: string;
  description?: string;
  workspaceId: string;
  datasetId?: string; // If this dashboard is primarily for one dataset
  widgets: WidgetConfig[];
}
