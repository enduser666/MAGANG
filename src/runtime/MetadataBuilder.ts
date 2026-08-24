import { ColumnMetadata } from '@/backend/lib/metadata-contract';

export class MetadataBuilder {
  public static build(inferredColumns: ColumnMetadata[]): ColumnMetadata[] {
    return inferredColumns.map((col) => {
      const nameLower = col.name.toLowerCase();
      const isNum = col.type === 'number';
      const isDate = col.type === 'date';
      
      // Smart formatting inference
      let displayFormat: 'CURRENCY' | 'PERCENTAGE' | 'DATE_LONG' | 'DATE_SHORT' | 'NUMBER_COMMAS' | 'TEXT' = 'TEXT';
      let align: 'left' | 'center' | 'right' = 'left';

      if (isNum) {
        align = 'right';
        if (
          nameLower.includes('nilai') || 
          nameLower.includes('jumlah') || 
          nameLower.includes('biaya') || 
          nameLower.includes('nominal') ||
          nameLower.includes('anggaran') ||
          nameLower.includes('setoran')
        ) {
          displayFormat = 'CURRENCY';
        } else if (
          nameLower.includes('persen') || 
          nameLower.includes('rate') || 
          nameLower.includes('bobot') ||
          nameLower.includes('persentase')
        ) {
          displayFormat = 'PERCENTAGE';
        } else {
          displayFormat = 'NUMBER_COMMAS';
        }
      } else if (isDate) {
        align = 'center';
        displayFormat = 'DATE_SHORT';
      }

      return {
        ...col,
        isPrimaryKey: col.name === 'id',
        isSearchable: col.type === 'string',
        isSortable: true,
        isEditable: col.name !== 'id',
        presentation: {
          width: isNum ? 130 : (isDate ? 160 : 200),
          align,
          displayFormat,
          isHidden: col.name === 'id' || col.name.startsWith('_'),
          ...col.presentation
        },
        validation: {
          isRequired: false,
          ...col.validation
        },
        analytics: {
          isMetric: isNum,
          isDimension: col.type === 'string',
          aggregation: isNum ? 'SUM' : 'COUNT',
          chartType: isNum ? 'BAR' : 'PIE',
          ...col.analytics
        }
      };
    });
  }
}
