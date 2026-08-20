import { getDbClient } from '../db';
import { ConnectorRegistry } from '../connectors/ConnectorRegistry';
import { MetadataBuilder } from './MetadataBuilder';
import { RelationshipResolver } from './RelationshipResolver';
import { PersistenceService } from './PersistenceService';

export class WorkbookIngestionOrchestrator {
  public static async execute(
    dbType: string,
    dbConfig: string | null,
    connectionDetails: Record<string, any>,
    workspaceId: string,
    creator: string
  ): Promise<{ success: boolean; datasetsIngested: string[] }> {
    const db = getDbClient(dbType, dbConfig);
    const persistence = new PersistenceService(dbType, dbConfig);
    const registry = ConnectorRegistry.getInstance();
    
    const sourceType = connectionDetails.sourceType || 'EXCEL';
    const connector = registry.getConnector(sourceType);

    await connector.connect(connectionDetails);
    const sheetNames = await connector.discover(connectionDetails);
    
    const datasetsIngested: string[] = [];
    const tempDatasetsList: any[] = [];

    await persistence.startTransaction();

    try {
      // Ingest datasets in sequence
      for (const sheetName of sheetNames) {
        const lowerName = sheetName.toLowerCase();
        if (
          lowerName.includes('panduan') || 
          lowerName.includes('readme') || 
          (lowerName.includes('sheet1') && sheetNames.length > 1)
        ) {
          continue;
        }

        const datasetId = sheetName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        
        const rawCols = await connector.fetchSchema(connectionDetails, sheetName);
        if (rawCols.length === 0) continue;

        const decoratedCols = MetadataBuilder.build(rawCols);
        
        await persistence.createDatasetTable(
          datasetId,
          sheetName,
          connectionDetails.sourceFile || 'unknown_source',
          creator,
          decoratedCols.map(c => ({ name: c.name, type: c.type, isNullable: c.isNullable }))
        );

        await persistence.registerDataset({
          id: datasetId,
          workspaceId,
          canonicalName: datasetId,
          displayName: sheetName,
          physicalTable: datasetId,
          category: lowerName.startsWith('ctrl') ? 'LOOKUP' : 'TRANSACTION',
          qualityScore: 100
        });

        let totalRows = 0;
        const batchGenerator = connector.stream(connectionDetails, sheetName, 2000);
        for await (const batch of batchGenerator) {
          await persistence.insertRecordsBatch(datasetId, batch, 'append');
          totalRows += batch.length;
        }

        await persistence.updateDatasetRowCount(datasetId, totalRows);

        tempDatasetsList.push({
          id: datasetId,
          canonicalName: datasetId,
          columns: decoratedCols
        });
        
        datasetsIngested.push(datasetId);

        await db.auditLogs.create({
          action: 'DATASET_INGESTION',
          details: `Dataset '${sheetName}' (${datasetId}) successfully ingested with ${totalRows} rows.`,
          user: creator
        });
      }

      for (const datasetId of datasetsIngested) {
        await RelationshipResolver.resolveAndRegister(dbType, dbConfig, datasetId, tempDatasetsList);
      }

      await persistence.commitTransaction();
      return { success: true, datasetsIngested };

    } catch (error) {
      await persistence.rollbackTransaction();
      throw error;
    }
  }
}
