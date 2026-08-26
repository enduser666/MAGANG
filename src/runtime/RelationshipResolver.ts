import { getDbClient } from '../db';

export class RelationshipResolver {
  public static async resolveAndRegister(
    dbType: string,
    dbConfig: string | null,
    datasetId: string,
    allDatasets: { id: string; canonicalName: string; columns: any[] }[]
  ): Promise<void> {
    const db = getDbClient(dbType, dbConfig);
    const sourceDataset = allDatasets.find(d => d.id === datasetId);
    if (!sourceDataset) return;

    for (const col of sourceDataset.columns) {
      const colName = col.name.toLowerCase();
      if (colName === 'id') continue;

      for (const target of allDatasets) {
        if (target.id === datasetId) continue;
        
        const targetCol = target.columns.find(
          c => c.name.toLowerCase() === colName || 
          (c.name.toLowerCase() === 'id' && target.canonicalName.toLowerCase() === colName)
        );
        
        if (targetCol) {
          await db.relationships.create({
            sourceDatasetId: datasetId,
            targetDatasetId: target.id,
            sourceColumn: col.name,
            targetColumn: targetCol.name,
            relationType: 'MANY_TO_ONE'
          });
        }
      }
    }
  }
}
