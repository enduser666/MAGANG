import { getDbClient } from '../db';
import { DatasetRuntime } from './DatasetRuntime';
import { ColumnMetadata } from '@/backend/lib/metadata-contract';

export class DatasetMutationRuntime {
  private db: any;
  private runtime: DatasetRuntime;

  constructor(dbType = 'sandbox', dbConfig: string | null = null) {
    this.db = getDbClient(dbType, dbConfig);
    this.runtime = new DatasetRuntime(dbType, dbConfig);
  }

  private async authorize(datasetId: string, role: string, action: 'CREATE' | 'UPDATE' | 'DELETE'): Promise<boolean> {
    const ds = await this.runtime.resolveDataset(datasetId);
    if (!ds) throw new Error(`Dataset not found: ${datasetId}`);

    const perm = await this.runtime.resolvePermissions(datasetId, role);
    if (!perm) return false;
    
    return perm.actions.includes(action);
  }

  private validatePayload(payload: any, columns: ColumnMetadata[], isUpdate = false): any {
    const validatedData: any = {};
    const errors: string[] = [];

    for (const col of columns) {
      if (col.presentation?.isHidden && !isUpdate) continue; // Skip hidden on create usually handled by DB, unless provided explicitly. Let's just process provided.

      const value = payload[col.name];

      // Primary Key / Auto-generated logic
      if (col.isPrimaryKey) {
        if (isUpdate && value !== undefined) {
          // It's allowed in payload if it's matching the record ID, but we shouldn't overwrite it usually
        }
        continue;
      }

      // Check required
      if (col.validation?.isRequired && !isUpdate && (value === undefined || value === null || value === '')) {
        errors.push(`${col.displayName || col.name} is required.`);
        continue;
      }

      if (value === undefined || value === null || value === '') {
        if (isUpdate && value === undefined) {
          continue; // Skip undefined fields in partial update
        }
        validatedData[col.name] = value;
        continue;
      }

      // Type checking & Constraints
      if (col.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${col.displayName || col.name} must be a number.`);
        } else {
          if (col.validation?.min !== undefined && num < col.validation.min) {
            errors.push(`${col.displayName || col.name} must be at least ${col.validation.min}.`);
          }
          if (col.validation?.max !== undefined && num > col.validation.max) {
            errors.push(`${col.displayName || col.name} must be at most ${col.validation.max}.`);
          }
          validatedData[col.name] = num;
        }
      } else if (col.type === 'boolean') {
        validatedData[col.name] = value === 'true' || value === true || value === 1 || value === '1';
      } else if (col.type === 'date') {
        const d = new Date(value);
        if (isNaN(d.getTime())) {
          errors.push(`${col.displayName || col.name} must be a valid date.`);
        } else {
          validatedData[col.name] = value;
        }
      } else {
        // String
        const str = String(value);
        if (col.validation?.regexPattern) {
          const regex = new RegExp(col.validation.regexPattern);
          if (!regex.test(str)) {
            errors.push(col.validation.validationErrorText || `${col.displayName || col.name} format is invalid.`);
          }
        }
        validatedData[col.name] = str;
      }
    }

    if (errors.length > 0) {
      const err = new Error(errors.join(' '));
      (err as any).status = 400;
      throw err;
    }

    return validatedData;
  }

  public async createRecord(
    datasetId: string,
    payload: any,
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<any> {
    const isAuthorized = await this.authorize(datasetId, userContext.role, 'CREATE');
    if (!isAuthorized) throw this.unauthorizedError();

    const ds = await this.runtime.resolveDataset(datasetId);
    if (!ds) throw new Error(`Dataset not found: ${datasetId}`);

    const validatedData = this.validatePayload(payload, ds.columns, false);
    const createdRecord = await this.db.createRecord(ds.physicalTable, validatedData);

    await this.logAudit('CREATE', datasetId, createdRecord.id || 0, userContext.username, { new: validatedData });
    return createdRecord;
  }

  public async updateRecord(
    datasetId: string,
    recordId: number,
    payload: any,
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<any> {
    const isAuthorized = await this.authorize(datasetId, userContext.role, 'UPDATE');
    if (!isAuthorized) throw this.unauthorizedError();

    const ds = await this.runtime.resolveDataset(datasetId);
    if (!ds) throw new Error(`Dataset not found: ${datasetId}`);

    const validatedData = this.validatePayload(payload, ds.columns, true);
    
    // Optional: Fetch before snapshot
    let oldRecord = null;
    try {
      oldRecord = await this.db.findRecordById(ds.physicalTable, recordId);
    } catch (e) {}

    const updatedRecord = await this.db.updateRecord(ds.physicalTable, recordId, validatedData);

    await this.logAudit('UPDATE', datasetId, recordId, userContext.username, { old: oldRecord, new: validatedData });
    return updatedRecord;
  }

  public async deleteRecord(
    datasetId: string,
    recordId: number,
    userContext: { username: string; role: string; satkerCode?: string }
  ): Promise<boolean> {
    const isAuthorized = await this.authorize(datasetId, userContext.role, 'DELETE');
    if (!isAuthorized) throw this.unauthorizedError();

    const ds = await this.runtime.resolveDataset(datasetId);
    if (!ds) throw new Error(`Dataset not found: ${datasetId}`);

    const success = await this.db.deleteRecord(ds.physicalTable, recordId);
    if (success) {
      await this.logAudit('DELETE', datasetId, recordId, userContext.username, null);
    }
    return success;
  }

  private async logAudit(action: 'CREATE' | 'UPDATE' | 'DELETE', datasetId: string, recordId: number, actorId: string, details: any) {
    try {
      await this.db.auditLogs.create({
        action,
        datasetId,
        recordId,
        actorId,
        timestamp: new Date().toISOString(),
        details: details ? JSON.stringify(details) : null
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }

  private unauthorizedError() {
    const err = new Error('You do not have permission to perform this action.');
    (err as any).status = 403;
    return err;
  }
}
