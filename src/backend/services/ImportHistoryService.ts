import { ImportHistoryRepository } from '@/repositories/ImportHistoryRepository';

export class ImportHistoryService {
  private historyRepo: ImportHistoryRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.historyRepo = new ImportHistoryRepository(dbType, dbConfig);
  }

  async listImportHistory() {
    return this.historyRepo.findMany();
  }

  async clearHistory() {
    return this.historyRepo.clearAll();
  }
}
