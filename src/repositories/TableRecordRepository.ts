import { BaseRepository } from './base';
import { QueryParams } from '@/db';

export class TableRecordRepository extends BaseRepository {
  async getTableMetadata(tableName: string) {
    return this.db.getTableMetadata(tableName);
  }

  async findRecords(tableName: string, params?: QueryParams) {
    return this.db.findRecords(tableName, params);
  }

  async findRecordById(tableName: string, id: number) {
    return this.db.findRecordById(tableName, id);
  }

  async createRecord(tableName: string, data: any) {
    return this.db.createRecord(tableName, data);
  }

  async updateRecord(tableName: string, id: number, data: any) {
    return this.db.updateRecord(tableName, id, data);
  }

  async deleteRecord(tableName: string, id: number) {
    return this.db.deleteRecord(tableName, id);
  }
}
