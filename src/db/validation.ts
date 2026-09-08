import { ColumnDefinition } from './types';
import { HIDDEN_COLLABORATION_COLUMNS } from './collaboration';

export interface IngestionValidationReport {
  isValid: boolean;
  totalRecords: number;
  duplicateCount: number;
  invalidRows: { index: number; errors: string[] }[];
}

export function validateDatasetSchema(columns: ColumnDefinition[], rows: any[]): IngestionValidationReport {
  console.time(`[SANDBOX-PERF] validateDatasetSchema (${rows.length} rows, ${columns.length} cols)`);
  const invalidRows: { index: number; errors: string[] }[] = [];
  const seenSignatures = new Set<string>();
  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowErrors: string[] = [];

    // Duplicate detection based on row values signature (excluding system keys)
    const businessKeys = Object.keys(row).filter(k => !HIDDEN_COLLABORATION_COLUMNS.has(k.toLowerCase()) && k !== 'id');
    const signature = JSON.stringify(businessKeys.map(k => row[k]));
    if (seenSignatures.has(signature)) {
      duplicateCount++;
    } else {
      seenSignatures.add(signature);
    }

    // Type constraint validation
    columns.forEach((col) => {
      const val = row[col.name];
      if (val !== undefined && val !== null && val !== '') {
        if (col.type === 'number') {
          if (isNaN(Number(val))) {
            rowErrors.push(`Kolom '${col.name}' harus bertipe angka. Nilai saat ini: '${val}'`);
          }
        } else if (col.type === 'date') {
          const parsedDate = Date.parse(String(val));
          if (isNaN(parsedDate)) {
            rowErrors.push(`Kolom '${col.name}' harus bertipe tanggal yang valid. Nilai saat ini: '${val}'`);
          }
        } else if (col.type === 'boolean') {
          const str = String(val).toLowerCase().trim();
          if (!['true', 'false', '1', '0', 'ya', 'tidak'].includes(str)) {
            rowErrors.push(`Kolom '${col.name}' harus bertipe boolean. Nilai saat ini: '${val}'`);
          }
        }
      }
    });

    if (rowErrors.length > 0) {
      invalidRows.push({ index: idx + 1, errors: rowErrors });
    }
  });

  console.timeEnd(`[SANDBOX-PERF] validateDatasetSchema (${rows.length} rows, ${columns.length} cols)`);
  return {
    isValid: invalidRows.length === 0,
    totalRecords: rows.length,
    duplicateCount,
    invalidRows
  };
}
