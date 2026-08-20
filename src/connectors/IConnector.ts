import { ColumnMetadata } from '../lib/metadata-contract';
import { QueryParams } from '../db';

export interface ConnectorInterface {
  connect(connectionDetails: Record<string, any>): Promise<boolean>;
  discover(connectionDetails: Record<string, any>): Promise<string[]>; // Returns sheet or table names
  fetchSchema(connectionDetails: Record<string, any>, sourceName: string): Promise<ColumnMetadata[]>;
  fetchRows(connectionDetails: Record<string, any>, sourceName: string, options?: QueryParams): Promise<any[]>;
  stream(connectionDetails: Record<string, any>, sourceName: string, batchSize: number): AsyncGenerator<any[]>;
}
