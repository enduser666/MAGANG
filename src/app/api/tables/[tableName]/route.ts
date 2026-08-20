import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { EventBus, BUSINESS_EVENTS } from '@/services/EventBus';
import { AuditService } from '@/services/AuditService';
import { TableRecordService } from '@/services/TableRecordService';
import { bootstrapDbListeners } from '@/lib/bootstrap';

export const GET = withAuth(async (request, user, { params }) => {
  try {
    const { tableName } = await params;
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);
    
    const recordService = new TableRecordService(dbType, dbConfig);

    const { getDbClient } = await import('@/db');
    const db = getDbClient(dbType, dbConfig) as any;
    
    let datasetMode = 'LEGACY_RELATIONAL';
    let targetTable = tableName;
    let columnMapping: any = null;
    let unitColumn = 'unit_id';
    let datasetId: string | null = null;
    let datasetName: string | null = null;

    if (db.pool) {
       const [rows] = await db.pool.query("SELECT * FROM sys_datasets WHERE is_active = 1 AND status = 'ACTIVE' LIMIT 1");
       if (rows.length > 0) {
          const ds = rows[0];
          datasetId = ds.id;
          datasetName = ds.dataset_name;
          datasetMode = ds.dataset_mode;
          if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
             const legacyTables = ['lhp', 'temuan', 'rekomendasi', 'temuan_pengawasan'];
             if (legacyTables.includes(tableName)) {
                 targetTable = ds.table_name;
             }
             columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
             if (columnMapping && columnMapping.unit) {
                unitColumn = columnMapping.unit.column;
             }
          }
       }
    }

    // Retrieve URL query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const meta = await recordService.getTableMetadata(targetTable);
    if (!meta) {
      return ApiResponse.error(`Table '${targetTable}' not found.`, null, 404);
    }

    // Parse and validate sortField
    const sortFieldRaw = searchParams.get('sortBy') || searchParams.get('sortField') || 'id';
    const validColumns = meta.columns.map(c => c.name.toLowerCase());
    const isValidSortField = validColumns.includes(sortFieldRaw.toLowerCase()) || sortFieldRaw.toLowerCase() === 'id';
    
    if (!isValidSortField) {
      return ApiResponse.error(`Invalid sort field: ${sortFieldRaw}`, null, 400);
    }
    const sortField = sortFieldRaw;

    const sortOrderRaw = searchParams.get('sortDirection') || searchParams.get('sortOrder') || 'desc';
    const sortOrder = (sortOrderRaw.toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc';

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20', 10);

    // Dynamic field filtering: any other query param that is not system parameter is treated as field filter
    const where: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      const isSystemParam = ['search', 'sortField', 'sortOrder', 'page', 'limit', 'sortBy', 'sortDirection', 'pageSize'].includes(key);
      if (!isSystemParam && val) {
        where[key] = val;
      }
    });

    let _customWhere: any = undefined;

    // Enforce Unit Scope
    if (user.accessScope === 'OWN_UNIT' && user.unitId) {
      delete where.unit_id;
      if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
         _customWhere = { sql: `\`${unitColumn}\` = ?`, values: [user.unitKode] };
      } else {
         if (targetTable === 'lhp') {
           where.unit_id = user.unitId;
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
               validatedUnitVal = datasetMode === 'DYNAMIC_FLAT_TABLE' ? uRows[0].kode_unit : uRows[0].id;
            }
        }
        if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
           _customWhere = { sql: `\`${unitColumn}\` = ?`, values: [validatedUnitVal] };
           delete where.unit_id;
        } else {
           if (targetTable === 'lhp') {
             where.unit_id = validatedUnitVal;
           } else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
             _customWhere = { sql: 'id_lhp IN (SELECT id FROM lhp WHERE unit_id = ?)', values: [validatedUnitVal] };
             delete where.unit_id;
           } else if (targetTable === 'rekomendasi') {
             _customWhere = { sql: 'id_temuan IN (SELECT t.id FROM temuan t JOIN lhp l ON t.id_lhp = l.id WHERE l.unit_id = ?)', values: [validatedUnitVal] };
             delete where.unit_id;
           }
        }
      }
    }

    const { data, total } = await recordService.findRecords(targetTable, {
      search,
      sortField,
      sortOrder,
      page,
      limit,
      where,
      _customWhere
    });

    if (db.pool && datasetId) {
       console.log('==============================');
       console.log('Logging Sementara (Tables GET)');
       console.log('==============================');
       console.log('Endpoint:', request.url);
       console.log('Dataset ID:', datasetId);
       console.log('Dataset Name:', datasetName);
       console.log('Dataset Mode:', datasetMode);
       console.log('Table Name:', targetTable);
       console.log('Column Mapping Keys:', columnMapping ? Object.keys(columnMapping) : 'None');
       console.log('Rows Returned:', data.length);
       console.log('SQL Check:', _customWhere ? _customWhere.sql : 'None');
       console.log('==============================');
    }

    return ApiResponse.success(data, 'Table records fetched successfully', {
      metadata: meta,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      },
      rows: data,
      totalRows: total,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page
    });
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to fetch table records.', error, 500);
  }
});

export const POST = withAuth(async (request, user, { params }) => {
  try {
    const { tableName } = await params;
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);
    
    const recordService = new TableRecordService(dbType, dbConfig);
    const auditService = new AuditService(dbType, dbConfig);
    const username = user.username;

    const body = await request.json();
    
    // Inject creator/owner properties into payload
    const payload = {
      ...body,
      owner_username: username,
      created_by: username,
      updated_by: username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workflow_status: 'Draft',
      record_version: 1
    };

    if (user.accessScope === 'OWN_UNIT' && user.unitId) {
      if (tableName === 'lhp') {
        payload.unit_id = user.unitId;
      } else if (tableName === 'temuan' || tableName === 'temuan_pengawasan') {
        const id_lhp = body.id_lhp;
        if (!id_lhp) return ApiResponse.error('id_lhp is required', null, 400);
        const lhp = await recordService.findRecordById('lhp', id_lhp);
        if (!lhp || lhp.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
      } else if (tableName === 'rekomendasi') {
        const id_temuan = body.id_temuan;
        if (!id_temuan) return ApiResponse.error('id_temuan is required', null, 400);
        const temuan = await recordService.findRecordById('temuan', id_temuan);
        if (!temuan) return ApiResponse.error('Temuan not found', null, 404);
        const lhp = await recordService.findRecordById('lhp', temuan.id_lhp);
        if (!lhp || lhp.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
      }
    }

    const record = await recordService.createRecord(tableName, payload);

    // Publish event
    const eventBus = EventBus.getInstance();
    await eventBus.publish(BUSINESS_EVENTS.RECORD_CREATED, {
      tableName,
      recordId: record.id,
      username,
      record
    });

    // Log to Audit Trail
    await auditService.writeLog({
      action: 'Record Inserted',
      details: `Menambahkan baris baru dengan ID ${record.id} di tabel '${tableName}'.`,
      user: username
    });

    return ApiResponse.success(record, 'Record created successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to create record.', error, 500);
  }
});

export const DELETE = withAuth(async (request, user, { params }) => {
  try {
    const { tableName } = await params;
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);
    
    const recordService = new TableRecordService(dbType, dbConfig);
    const auditService = new AuditService(dbType, dbConfig);
    const username = user.username;

    // Dynamic table deletes should still invoke deleteDynamicTable on database client directly, or wrapper if exists
    const repo = recordService['recordRepo'];
    const success = await repo['db'].deleteDynamicTable(tableName);
    if (!success) {
      return ApiResponse.error(`Table '${tableName}' could not be deleted.`, null, 400);
    }

    // Log to Audit Trail
    await auditService.writeLog({
      action: 'Table Deleted',
      details: `Menghapus tabel dinamis '${tableName}' dari database.`,
      user: username
    });

    return ApiResponse.success(null, `Table '${tableName}' deleted successfully.`);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to delete table.', error, 500);
  }
});
