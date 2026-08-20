import { getDbClient } from '../db';
import { DatasetMetadata, ColumnMetadata, RelationshipMetadata, PermissionMetadata } from '../lib/metadata-contract';

export class DatasetRuntime {
  private db: any;

  constructor(dbType = 'sandbox', dbConfig: string | null = null) {
    this.db = getDbClient(dbType, dbConfig);
  }

  public async resolveDataset(datasetId: string): Promise<DatasetMetadata | null> {
    const ds = await this.db.datasets.findById(datasetId);
    if (!ds) return null;

    const meta = await this.db.getTableMetadata(ds.physicalTable);
    if (!meta) return null;

    let columns: ColumnMetadata[] = [];
    try {
      columns = typeof meta.columns === 'string' ? JSON.parse(meta.columns) : meta.columns || [];
    } catch (e) {
      console.error('Error parsing dataset columns:', e);
    }



    return {
      id: ds.id,
      workspaceId: ds.workspaceId,
      canonicalName: ds.canonicalName,
      displayName: ds.displayName,
      physicalTable: ds.physicalTable,
      category: ds.category as 'TRANSACTION' | 'LOOKUP' | 'MASTER' | 'CONFIG',
      rowCount: ds.rowCount || 0,
      qualityScore: ds.qualityScore || 100,
      columns,
      relationships: [],
      permissions: []
    };
  }

  public async resolveMetadata(datasetId: string): Promise<ColumnMetadata[]> {
    const ds = await this.resolveDataset(datasetId);
    return ds?.columns || [];
  }

  public async resolveRelationships(datasetId: string): Promise<RelationshipMetadata[]> {
    const rels = await this.db.relationships.findMany(datasetId);
    return rels.map((r: any) => ({
      sourceDatasetId: r.sourceDatasetId,
      targetDatasetId: r.targetDatasetId,
      sourceColumn: r.sourceColumn,
      targetColumn: r.targetColumn,
      relationType: r.relationType as 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY'
    }));
  }

  public async resolvePermissions(datasetId: string, role: string): Promise<PermissionMetadata | null> {
    const perms = await this.db.permissions.findMany(datasetId);
    const rolePerm = perms.find((p: any) => p.role.toLowerCase() === role.toLowerCase());
    if (!rolePerm) return null;

    let actions: string[] = [];
    let columnMasks: string[] = [];
    try {
      actions = typeof rolePerm.actions === 'string' ? JSON.parse(rolePerm.actions) : rolePerm.actions || [];
      columnMasks = typeof rolePerm.columnMasks === 'string' ? JSON.parse(rolePerm.columnMasks) : rolePerm.columnMasks || [];
    } catch (e) {
      console.error('Error parsing permissions json strings:', e);
    }

    return {
      role: rolePerm.role,
      actions: actions as ('CREATE' | 'READ' | 'UPDATE' | 'DELETE')[],
      columnMasks,
      rowFilterQuery: rolePerm.rowFilterQuery || undefined
    };
  }
}
