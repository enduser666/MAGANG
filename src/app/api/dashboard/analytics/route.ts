import { ApiResponse } from '@/backend/lib/api-response';
import { AnalyticsService } from '@/backend/services/AnalyticsService';
import { withAuth } from '@/backend/lib/auth';
import { getDbClient } from '@/db';

export const GET = withAuth(async (request, user) => {
  const startTime = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const requestedTableName = searchParams.get('tableName');
    
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig) as any;
    
    let datasetMode = 'LEGACY_RELATIONAL';
    let targetTable = requestedTableName || 'lhp';
    let columnMapping: any = null;
    let unitColumn = 'unit_id';
    let datasetId: string | null = null;
    let datasetName: string | null = null;

    if (db.pool) {
       const [rows] = await db.pool.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
       if (rows.length > 0) {
          const ds = rows[0];
          datasetId = ds.id;
          datasetName = ds.dataset_name;
          datasetMode = ds.dataset_mode;
          targetTable = ds.table_name || targetTable;
          columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
          
          if (datasetMode === 'DYNAMIC_FLAT_TABLE' && columnMapping && columnMapping.unit) {
            unitColumn = columnMapping.unit.column;
          }
       }
    }

    const service = new AnalyticsService(dbType, dbConfig);
    let _customWhere: any = undefined;

    if (user.accessScope === 'OWN_UNIT' && user.unitId) {
      if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
         _customWhere = { sql: `\`${unitColumn}\` = ?`, values: [user.unitKode] };
      } else {
         if (targetTable === 'lhp') {
           _customWhere = { sql: 'unit_id = ?', values: [user.unitId] };
         } else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
           _customWhere = { sql: 'id_lhp IN (SELECT id FROM lhp WHERE unit_id = ?)', values: [user.unitId] };
         } else if (targetTable === 'rekomendasi') {
           _customWhere = { sql: 'id_temuan IN (SELECT t.id FROM temuan t JOIN lhp l ON t.id_lhp = l.id WHERE l.unit_id = ?)', values: [user.unitId] };
         }
      }
    } else if (user.accessScope === 'ALL_UNITS') {
      const clientUnitId = searchParams.get('unit_id');
      if (clientUnitId && clientUnitId !== 'all') {
         let validatedUnitVal = clientUnitId;
         if (db.pool) {
            const [uRows] = await db.pool.query('SELECT id, kode_unit FROM sys_units WHERE id = ? OR kode_unit = ? LIMIT 1', [clientUnitId, clientUnitId]);
            if (uRows.length > 0) {
               if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
                  validatedUnitVal = uRows[0].kode_unit;
               } else {
                  validatedUnitVal = uRows[0].id;
               }
            }
         }

         if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
            _customWhere = { sql: `\`${unitColumn}\` = ?`, values: [validatedUnitVal] };
         } else {
           if (targetTable === 'lhp') {
             _customWhere = { sql: 'unit_id = ?', values: [validatedUnitVal] };
           } else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
             _customWhere = { sql: 'id_lhp IN (SELECT id FROM lhp WHERE unit_id = ?)', values: [validatedUnitVal] };
           } else if (targetTable === 'rekomendasi') {
             _customWhere = { sql: 'id_temuan IN (SELECT t.id FROM temuan t JOIN lhp l ON t.id_lhp = l.id WHERE l.unit_id = ?)', values: [validatedUnitVal] };
           }
         }
      }
    }

    // Must update service and repo to accept the new params
    const data = await service.getDashboardAnalytics(targetTable, _customWhere, datasetMode, columnMapping);

    if (db.pool && datasetId && data.diagnosticLogs) {
       const d = data.diagnosticLogs;
       
       const pieMatches = d.pieTotal === d.distinctFinding;
       const barMatches = d.barTotal === d.distinctFinding;
       const trendMatches = d.trendTotal === d.distinctFinding;
       const isConsistent = pieMatches && barMatches && trendMatches;
       
       console.log('==============================');
       console.log('Logging Sementara (Analytics)');
       console.log('==============================');
       console.log('Endpoint:', request.url);
       console.log('Dataset:', datasetName || datasetId);
       console.log('Mode:', datasetMode);
       console.log('Table:', targetTable);
       console.log('Column Mapping Keys:', columnMapping ? Object.keys(columnMapping) : 'None');
       console.log('SQL Check:', _customWhere ? _customWhere.sql : 'None');
       console.log('Rows:', d.rawRows);
       console.log('Execution Time:', `${Date.now() - startTime}ms`);
       
       console.log('');
       console.log('--- Chart Verification ---');
       console.log('Entity Dashboard: TEMUAN');
       console.log('Executive Overview :', d.distinctFinding);
       console.log('Pie Chart :', d.pieTotal);
       console.log('Bar Chart :', d.barTotal);
       console.log('Trend :', d.trendTotal);
       if (isConsistent) {
           console.log('CONSISTENCY CHECK: PASS');
       } else {
           console.log('CONSISTENCY CHECK: FAIL');
       }
       console.log('==============================');
    }

    return ApiResponse.success(data, 'Dashboard analytics data fetched successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Gagal mengambil data analitik.', error, 500);
  }
});
