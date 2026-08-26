import { getDbClient, QueryParams } from '../db';
import { DatasetRuntime } from './DatasetRuntime';

export class QueryEngine {
  private db: any;
  private runtime: DatasetRuntime;

  constructor(dbType = 'sandbox', dbConfig: string | null = null) {
    this.db = getDbClient(dbType, dbConfig);
    this.runtime = new DatasetRuntime(dbType, dbConfig);
  }

  public async query(
    datasetId: string,
    params: QueryParams,
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<{ data: any[]; total: number }> {
    const ds = await this.runtime.resolveDataset(datasetId);
    if (!ds) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const perm = await this.runtime.resolvePermissions(datasetId, userContext.role);
    
    const queryParams: QueryParams = { ...params };
    if (perm && perm.rowFilterQuery) {
      const match = perm.rowFilterQuery.match(/(\w+)\s*=\s*'([^']+)'/);
      if (match) {
        const [, col, val] = match;
        if (!queryParams.where) queryParams.where = {};
        queryParams.where[col] = val;
      }
    }

    const result = await this.db.findRecords(ds.physicalTable, queryParams);

    let sanitizedData = result.data;
    if (perm && perm.columnMasks && perm.columnMasks.length > 0) {
      const masks = perm.columnMasks;
      sanitizedData = result.data.map((row: any) => {
        const cleanRow = { ...row };
        masks.forEach((col) => {
          if (cleanRow[col] !== undefined) {
            cleanRow[col] = '*** MASKED ***';
          }
        });
        return cleanRow;
      });
    }

    return {
      data: sanitizedData,
      total: result.total
    };
  }

  public async aggregate(
    datasetId: string,
    metricColumns: string[],
    dimensionColumns: string[],
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<any[]> {
    const ds = await this.runtime.resolveDataset(datasetId);
    if (!ds) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const perm = await this.runtime.resolvePermissions(datasetId, userContext.role);
    
    // Check CLS on requested metric and dimension columns
    if (perm && perm.columnMasks && perm.columnMasks.length > 0) {
      const masks = perm.columnMasks;
      const invalidMetrics = metricColumns.filter(c => masks.includes(c));
      const invalidDimensions = dimensionColumns.filter(c => masks.includes(c));
      
      if (invalidMetrics.length > 0 || invalidDimensions.length > 0) {
        throw new Error(`Access Restricted: Cannot aggregate masked columns (${[...invalidMetrics, ...invalidDimensions].join(', ')})`);
      }
    }

    const queryParams: QueryParams = {};
    if (perm && perm.rowFilterQuery) {
      const match = perm.rowFilterQuery.match(/(\w+)\s*=\s*'([^']+)'/);
      if (match) {
        const [, col, val] = match;
        queryParams.where = { [col]: val };
      }
    }

    return this.db.aggregateDataset(ds.physicalTable, metricColumns, dimensionColumns, queryParams);
  }
}
