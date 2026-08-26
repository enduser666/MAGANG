import { AnalyticsRepository } from '@/repositories/AnalyticsRepository';

export class AnalyticsService {
  private analyticsRepo: AnalyticsRepository;

  constructor(dbType: string, dbConfig: string | null) {
    this.analyticsRepo = new AnalyticsRepository(dbType, dbConfig);
  }

  async getDashboardAnalytics(tableName: string, customWhere?: any, datasetMode?: string, columnMapping?: any) {
    if (!tableName) {
      throw new Error('Table name is required for dashboard analytics');
    }
    return this.analyticsRepo.getTableAnalytics(tableName, customWhere, datasetMode, columnMapping);
  }
}
