import { getDbClient, DbInterface } from '@/db';

export class BaseRepository {
  protected db: DbInterface;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.db = getDbClient(dbType, dbConfig);
  }
}
