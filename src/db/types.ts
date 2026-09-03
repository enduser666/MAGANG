export interface ColumnDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  isNullable?: boolean;
}

export interface TableMetadata {
  name: string;
  displayName: string;
  sourceFile: string;
  creator: string;
  createdAt: string;
  rowCount: number;
  columns: ColumnDefinition[];
  qualityScore: number;
}

export interface QueryParams {
  where?: Record<string, any>;
  search?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  _customWhere?: { sql: string; values?: any[] };
}

export interface IngestionValidationReport {
  isValid: boolean;
  totalRecords: number;
  duplicateCount: number;
  invalidRows: { index: number; errors: string[] }[];
}

export interface DbInterface {
  listTables(): Promise<TableMetadata[]>;
  getTableMetadata(tableName: string): Promise<TableMetadata | null>;
  createDynamicTable(
    name: string,
    displayName: string,
    sourceFile: string,
    creator: string,
    columns: ColumnDefinition[],
    rows: any[],
    qualityScore?: number,
    importMode?: 'overwrite' | 'append'
  ): Promise<{ success: boolean; rowCount: number }>;
  deleteDynamicTable(tableName: string): Promise<boolean>;

  findRecords(tableName: string, params?: QueryParams): Promise<{ data: any[]; total: number }>;
  findRecordById(tableName: string, id: number): Promise<any | null>;
  getTableAnalytics(
    tableName: string,
    customWhere?: any,
    datasetMode?: string,
    columnMapping?: any
  ): Promise<any>;
  createRecord(tableName: string, data: any): Promise<any>;
  updateRecord(tableName: string, id: number, data: any): Promise<any>;
  deleteRecord(tableName: string, id: number): Promise<any>;
  aggregateDataset(
    tableName: string,
    metricColumns: string[],
    dimensionColumns: string[],
    params?: QueryParams
  ): Promise<any[]>;
  bulkInsertRecords(tableName: string, records: any[]): Promise<void>;
  executeRawUnsafe(sql: string, params?: any[]): Promise<any>;

  // System registries
  importHistory: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    clearAll(): Promise<void>;
  };
  auditLogs: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    clearAll(): Promise<void>;
  };
  users: {
    findByUsername(username: string): Promise<any | null>;
    create(data: {
      username: string;
      passwordHash: string;
      role?: string;
      fullName?: string;
      nip?: string;
      email?: string;
      phoneNumber?: string;
      unitKerja?: string;
    }): Promise<any>;
    findMany(): Promise<any[]>;
    updateProfile(userId: number, data: {
      fullName?: string;
      avatarUrl?: string;
      email?: string;
      nip?: string;
      phoneNumber?: string;
      unitKerja?: string;
      role?: string;
    }): Promise<any>;
    deleteUser(userId: number): Promise<boolean>;
  };
  dashboardWidgets: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    delete(id: number): Promise<boolean>;
    clearAll(): Promise<void>;
  };
  accessRequests: {
    findMany(): Promise<any[]>;
    create(data: { username: string; requestedRole: string }): Promise<any>;
    updateStatus(id: number, status: string): Promise<any>;
  };
  pipelineJobs: {
    findMany(): Promise<any[]>;
    create(data: any): Promise<any>;
    updateStatus(id: number, status: string, durationMs?: number): Promise<any>;
  };
  presenceLocks: {
    findMany(): Promise<any[]>;
    findLock(tableName: string, recordId: number): Promise<any | null>;
    create(data: { tableName: string; recordId: number; username: string; lockedUntil: string }): Promise<any>;
    delete(tableName: string, recordId: number): Promise<boolean>;
    deleteExpired(): Promise<void>;
  };
  approvals: {
    findMany(): Promise<any[]>;
    findRequest(tableName: string, recordId: number): Promise<any | null>;
    findRequestById(id: number): Promise<any | null>;
    create(data: { tableName: string; recordId: number; requester: string; status: string; comments?: string }): Promise<any>;
    update(id: number, data: { status: string; reviewer?: string; comments?: string }): Promise<any>;
  };
  activityFeed: {
    findMany(limit?: number): Promise<any[]>;
    create(data: {
      eventType: string;
      actorUsername: string;
      actorFullName: string;
      targetTable: string;
      targetId: number;
      description: string;
    }): Promise<any>;
  };
  notifications: {
    findMany(recipient: string): Promise<any[]>;
    create(data: { recipient: string; title: string; message: string }): Promise<any>;
    markRead(ids: number[]): Promise<void>;
  };
  workspaces: {
    findMany(): Promise<any[]>;
    create(data: { id: string; name: string }): Promise<any>;
    clearAll(): Promise<void>;
  };
  datasets: {
    findMany(workspaceId?: string): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    findByPhysicalTable(physicalTable: string): Promise<any | null>;
    create(data: {
      id: string;
      workspaceId: string;
      canonicalName: string;
      displayName: string;
      physicalTable: string;
      category: string;
      rowCount?: number;
      qualityScore?: number;
    }): Promise<any>;
    updateRowCount(id: string, rowCount: number): Promise<any>;
    delete(id: string): Promise<boolean>;
    clearAll(): Promise<void>;
  };
  relationships: {
    findMany(datasetId?: string): Promise<any[]>;
    create(data: {
      sourceDatasetId: string;
      targetDatasetId: string;
      sourceColumn: string;
      targetColumn: string;
      relationType: string;
    }): Promise<any>;
    clearAll(): Promise<void>;
  };
  views: {
    findMany(datasetId: string): Promise<any[]>;
    create(data: {
      id: string;
      datasetId: string;
      name: string;
      filterQuery?: Record<string, any>;
      sortColumn?: string;
      sortOrder?: 'asc' | 'desc';
      pageLimit?: number;
    }): Promise<any>;
    delete(id: string): Promise<boolean>;
    clearAll(): Promise<void>;
  };
  permissions: {
    findMany(datasetId: string): Promise<any[]>;
    create(data: {
      datasetId: string;
      role: string;
      actions: string[];
      columnMasks?: string[];
      rowFilterQuery?: string;
    }): Promise<any>;
    clearAll(): Promise<void>;
  };

  testConnection(): Promise<{ success: boolean; message: string }>;
  initializeSchema(): Promise<{ success: boolean; message: string }>;
}
