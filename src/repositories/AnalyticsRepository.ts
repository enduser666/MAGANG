import { getDbClient } from '@/db';

export class AnalyticsRepository {
  private db;

  constructor(dbType: string, dbConfig: string | null) {
    this.db = getDbClient(dbType, dbConfig);
  }

  async getTableAnalytics(tableName: string, customWhere?: any, datasetMode?: string, columnMapping?: any) {
    return this.db.getTableAnalytics(tableName, customWhere, datasetMode, columnMapping);
  }
}
