import { TableRecordRepository } from '@/repositories/TableRecordRepository';
import { QueryParams } from '@/db';

export class TableRecordService {
  private recordRepo: TableRecordRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.recordRepo = new TableRecordRepository(dbType, dbConfig);
  }

  async getTableMetadata(tableName: string) {
    return this.recordRepo.getTableMetadata(tableName);
  }

  async findRecords(tableName: string, params?: QueryParams) {
    return this.recordRepo.findRecords(tableName, params);
  }

  async findRecordById(tableName: string, id: number) {
    return this.recordRepo.findRecordById(tableName, id);
  }

  async createRecord(tableName: string, data: any) {
    return this.recordRepo.createRecord(tableName, data);
  }

  async updateRecord(tableName: string, id: number, data: any) {
    return this.recordRepo.updateRecord(tableName, id, data);
  }

  async deleteRecord(tableName: string, id: number) {
    return this.recordRepo.deleteRecord(tableName, id);
  }
}
