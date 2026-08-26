import { getDbClient } from '../db';

export class PersistenceService {
  private db: any;
  private createdDatasetIds: string[] = [];
  private createdTableNames: string[] = [];
  private sandboxBackup: any = null;

  constructor(dbType = 'sandbox', dbConfig: string | null = null) {
    this.db = getDbClient(dbType, dbConfig);
  }

  public async startTransaction(): Promise<void> {
    if (this.db.driver === 'SANDBOX') {
      const dbFile = this.db.readSandbox();
      this.sandboxBackup = JSON.parse(JSON.stringify(dbFile.system));
    } else {
      await this.db.executeRawUnsafe('BEGIN');
    }
    this.createdDatasetIds = [];
    this.createdTableNames = [];
  }

  public async commitTransaction(): Promise<void> {
    if (this.db.driver === 'POSTGRES') {
      await this.db.executeRawUnsafe('COMMIT');
    }
    this.sandboxBackup = null;
    this.createdDatasetIds = [];
    this.createdTableNames = [];
  }

  public async rollbackTransaction(): Promise<void> {
    if (this.db.driver === 'SANDBOX') {
      if (this.sandboxBackup) {
        const dbFile = this.db.readSandbox();
        dbFile.system = this.sandboxBackup;
        
        for (const tbl of this.createdTableNames) {
          delete dbFile.tables[tbl];
        }
        
        this.db.writeSandbox(dbFile);
      }
    } else {
      try {
        await this.db.executeRawUnsafe('ROLLBACK');
      } catch (e) {
        console.error('SQL Rollback failed:', e);
      }
      
      // Compensating drop cleanup loop for PostgreSQL
      for (const datasetId of this.createdDatasetIds) {
        try {
          await this.db.datasets.delete(datasetId);
        } catch (err) {}
      }
      for (const tbl of this.createdTableNames) {
        try {
          await this.db.deleteDynamicTable(tbl);
        } catch (err) {}
        try {
          await this.db.executeRawUnsafe('DELETE FROM "_sidata_metadata" WHERE "name" = $1', [tbl]);
        } catch (err) {}
      }
    }
    this.sandboxBackup = null;
    this.createdDatasetIds = [];
    this.createdTableNames = [];
  }

  public async createDatasetTable(
    datasetId: string,
    displayName: string,
    sourceFile: string,
    creator: string,
    columns: { name: string; type: 'string' | 'number' | 'boolean' | 'date'; isNullable?: boolean }[]
  ): Promise<void> {
    await this.db.createDynamicTable(
      datasetId,
      displayName,
      sourceFile,
      creator,
      columns,
      [],
      100,
      'overwrite'
    );
    this.createdTableNames.push(datasetId);
  }

  public async insertRecordsBatch(
    datasetId: string,
    records: any[],
    importMode: 'overwrite' | 'append' = 'append'
  ): Promise<void> {
    if (records.length === 0) return;

    if (importMode === 'overwrite' && this.db.driver === 'SANDBOX') {
      const dbFile = this.db.readSandbox();
      if (dbFile.tables[datasetId]) {
        dbFile.tables[datasetId].rows = [];
        dbFile.tables[datasetId].metadata.rowCount = 0;
        this.db.writeSandbox(dbFile);
      }
    }

    if (typeof this.db.bulkInsertRecords === 'function') {
      await this.db.bulkInsertRecords(datasetId, records);
    } else {
      for (const record of records) {
        await this.db.createRecord(datasetId, record);
      }
    }
  }

  public async registerDataset(data: {
    id: string;
    workspaceId: string;
    canonicalName: string;
    displayName: string;
    physicalTable: string;
    category: string;
    rowCount?: number;
    qualityScore?: number;
  }): Promise<void> {
    await this.db.datasets.create(data);
    this.createdDatasetIds.push(data.id);
  }

  public async updateDatasetRowCount(id: string, rowCount: number): Promise<void> {
    await this.db.datasets.updateRowCount(id, rowCount);
  }
}
