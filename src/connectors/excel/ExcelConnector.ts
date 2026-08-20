import * as XLSX from 'xlsx';
import { ConnectorInterface } from '../IConnector';
import { ColumnMetadata } from '../../lib/metadata-contract';
import { QueryParams } from '../../db';

export class ExcelConnector implements ConnectorInterface {
  private getWorkbook(connectionDetails: Record<string, any>): XLSX.WorkBook {
    let data: any;
    if (connectionDetails.fileBuffer) {
      data = connectionDetails.fileBuffer;
    } else if (connectionDetails.base64Data) {
      data = Buffer.from(connectionDetails.base64Data, 'base64');
    } else {
      throw new Error('Connection details must contain fileBuffer or base64Data.');
    }
    return XLSX.read(data, { type: 'array', cellDates: true });
  }

  async connect(connectionDetails: Record<string, any>): Promise<boolean> {
    try {
      this.getWorkbook(connectionDetails);
      return true;
    } catch (e) {
      return false;
    }
  }

  async discover(connectionDetails: Record<string, any>): Promise<string[]> {
    const wb = this.getWorkbook(connectionDetails);
    return wb.SheetNames;
  }

  async fetchSchema(connectionDetails: Record<string, any>, sourceName: string): Promise<ColumnMetadata[]> {
    const wb = this.getWorkbook(connectionDetails);
    const sheet = wb.Sheets[sourceName];
    if (!sheet) throw new Error(`Sheet ${sourceName} not found in workbook.`);

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) return [];

    // Take the keys of the first row as columns
    const firstRow = rows[0];
    const columns: ColumnMetadata[] = Object.keys(firstRow).map((colName) => {
      // Basic type inference by scanning values
      let inferredType: 'string' | 'number' | 'boolean' | 'date' = 'string';
      
      const values = rows.slice(0, 50).map(r => r[colName]).filter(v => v !== undefined && v !== null && v !== '');
      if (values.length > 0) {
        const isNumeric = values.every(v => !isNaN(Number(v)));
        const isDate = values.every(v => v instanceof Date || !isNaN(Date.parse(String(v))));
        const isBoolean = values.every(v => {
          const s = String(v).toLowerCase().trim();
          return ['true', 'false', '1', '0', 'ya', 'tidak'].includes(s);
        });

        if (isNumeric) inferredType = 'number';
        else if (isDate) inferredType = 'date';
        else if (isBoolean) inferredType = 'boolean';
      }

      return {
        name: colName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        displayName: colName,
        type: inferredType,
        presentation: {
          width: 150,
          align: inferredType === 'number' ? 'right' : 'left',
          displayFormat: inferredType === 'number' ? 'TEXT' : (inferredType === 'date' ? 'DATE_SHORT' : 'TEXT'),
          isHidden: false
        },
        validation: {
          isRequired: false
        },
        analytics: {
          isMetric: inferredType === 'number',
          isDimension: inferredType === 'string' && values.length > 0
        }
      };
    });

    return columns;
  }

  async fetchRows(connectionDetails: Record<string, any>, sourceName: string, options?: QueryParams): Promise<any[]> {
    const wb = this.getWorkbook(connectionDetails);
    const sheet = wb.Sheets[sourceName];
    if (!sheet) throw new Error(`Sheet ${sourceName} not found in workbook.`);

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) return [];
    
    // Map column names to sanitized lower_snake_case key names to align with inferred schema
    const schema = await this.fetchSchema(connectionDetails, sourceName);
    const colNameMap = new Map<string, string>();
    schema.forEach(col => {
      const origKey = Object.keys(rows[0] || {}).find(k => k.toLowerCase().replace(/[^a-z0-9_]/g, '_') === col.name);
      if (origKey) colNameMap.set(origKey, col.name);
    });

    const mappedRows = rows.map((row) => {
      const newRow: any = {};
      Object.entries(row).forEach(([k, v]) => {
        const newKey = colNameMap.get(k) || k.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        newRow[newKey] = v;
      });
      return newRow;
    });

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    return mappedRows.slice(offset, offset + limit);
  }

  async *stream(connectionDetails: Record<string, any>, sourceName: string, batchSize: number): AsyncGenerator<any[]> {
    const wb = this.getWorkbook(connectionDetails);
    const sheet = wb.Sheets[sourceName];
    if (!sheet) throw new Error(`Sheet ${sourceName} not found in workbook.`);

    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) return;
    const schema = await this.fetchSchema(connectionDetails, sourceName);
    const colNameMap = new Map<string, string>();
    schema.forEach(col => {
      const origKey = Object.keys(rows[0] || {}).find(k => k.toLowerCase().replace(/[^a-z0-9_]/g, '_') === col.name);
      if (origKey) colNameMap.set(origKey, col.name);
    });

    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const mappedChunk = chunk.map((row) => {
        const newRow: any = {};
        Object.entries(row).forEach(([k, v]) => {
          const newKey = colNameMap.get(k) || k.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          newRow[newKey] = v;
        });
        return newRow;
      });
      yield mappedChunk;
    }
  }
}
