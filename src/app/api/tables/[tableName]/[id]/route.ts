import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { PresenceService } from '@/services/PresenceService';
import { AuditService } from '@/services/AuditService';
import { WorkflowEngine } from '@/services/WorkflowEngine';
import { TableRecordService } from '@/services/TableRecordService';
import { bootstrapDbListeners } from '@/lib/bootstrap';
import { EventBus, BUSINESS_EVENTS } from '@/services/EventBus';

export const PUT = withAuth(async (request, user, { params }) => {
  try {
    const { tableName, id } = await params;
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return ApiResponse.error('Invalid ID parameter.', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);
    
    const recordService = new TableRecordService(dbType, dbConfig);
    const presenceService = new PresenceService(dbType, dbConfig);
    const auditService = new AuditService(dbType, dbConfig);
    const workflowEngine = new WorkflowEngine(dbType, dbConfig);

    const username = user.username;
    const body = await request.json();

    const { getDbClient } = await import('@/db');
    const db = getDbClient(dbType, dbConfig) as any;
    
    let datasetMode = 'LEGACY_RELATIONAL';
    let targetTable = tableName;
    let unitColumn = 'unit_id';

    if (db.pool) {
       const [rows] = await db.pool.query("SELECT * FROM sys_datasets WHERE is_active = 1 AND status = 'ACTIVE' LIMIT 1");
       if (rows.length > 0) {
          const ds = rows[0];
          datasetMode = ds.dataset_mode;
          if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
             const legacyTables = ['lhp', 'temuan', 'rekomendasi', 'temuan_pengawasan'];
             if (legacyTables.includes(tableName)) {
                 targetTable = ds.table_name;
             }
             const columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
             if (columnMapping && columnMapping.unit) {
                unitColumn = columnMapping.unit.column;
             }
          }
       }
    }

    // 1. Enforce read-only state validation checks
    const isReadOnly = await workflowEngine.isRecordReadOnly(targetTable, numericId);
    if (isReadOnly) {
      return ApiResponse.error(
        'Data ini sedang dalam proses review/persetujuan dan bersifat read-only. Perubahan langsung tidak diizinkan.',
        null,
        403
      );
    }

    // 2. Enforce Pessimistic Row Lock verification
    const isLockValid = await presenceService.verifyLockForWrite(targetTable, numericId, username);
    if (!isLockValid) {
      return ApiResponse.error('Data sedang dikunci oleh pengguna lain.', null, 423); // 423 Locked
    }

    // 3. Enforce Optimistic Concurrency Control
    // Extract version metadata from body
    const { record_version, ...updatePayload } = body;
    const versionCheck = await presenceService.validateOptimisticVersion(
      targetTable,
      numericId,
      Number(record_version || 1)
    );

    if (!versionCheck.success) {
      return ApiResponse.error(versionCheck.message || 'Optimistic lock conflict', versionCheck, 409);
    }

    // Fetch existing old record for restoration registry delta
    let oldRecord: any = null;
    try {
      oldRecord = await recordService.findRecordById(targetTable, numericId);
    } catch (e) {
      console.error('Failed to capture old record snapshot:', e);
    }

    if (user.accessScope === 'OWN_UNIT' && user.unitId) {
      if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
         if (!oldRecord || oldRecord[unitColumn] !== user.unitKode) return ApiResponse.error('Access denied: Record belongs to another unit', null, 403);
      } else {
        if (targetTable === 'lhp') {
          if (!oldRecord || oldRecord.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
        } else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
          const lhp = await recordService.findRecordById('lhp', oldRecord.id_lhp);
          if (!lhp || lhp.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
        } else if (targetTable === 'rekomendasi') {
          const temuan = await recordService.findRecordById('temuan', oldRecord.id_temuan);
          if (temuan) {
            const lhp = await recordService.findRecordById('lhp', temuan.id_lhp);
            if (!lhp || lhp.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
          }
        }
      }
    }

    // Append incremented version and update timestamps/authors
    const finalPayload = {
      ...updatePayload,
      record_version: versionCheck.nextVersion || 1,
      updated_by: username,
      updated_at: new Date().toISOString()
    };

    if (user.accessScope === 'OWN_UNIT' && user.unitId && targetTable === 'lhp') {
      finalPayload.unit_id = user.unitId;
    }

    const record = await recordService.updateRecord(targetTable, numericId, finalPayload);

    // Release the pessimistic lock after successful write
    await presenceService.releaseLock(targetTable, numericId, username);

    // Publish event
    const eventBus = EventBus.getInstance();
    await eventBus.publish(BUSINESS_EVENTS.RECORD_UPDATED, {
      tableName: targetTable,
      recordId: numericId,
      username,
      oldValue: oldRecord || {},
      newValue: finalPayload
    });

    // Construct delta history details
    const deltaPayload = {
      tableName: targetTable,
      recordId: numericId,
      oldValue: oldRecord || {},
      newValue: finalPayload
    };

    // Log to Audit Trail
    await auditService.writeLog({
      action: 'Record Updated',
      details: `Mengubah baris ID ${numericId} di tabel '${targetTable}'. Snapshot: ${JSON.stringify(deltaPayload)}`,
      user: username
    });

    return ApiResponse.success(record, 'Record updated successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to update record.', error, 500);
  }
});

export const DELETE = withAuth(async (request, user, { params }) => {
  try {
    const { tableName, id } = await params;
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }
    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return ApiResponse.error('Invalid ID parameter.', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const recordService = new TableRecordService(dbType, dbConfig);
    const presenceService = new PresenceService(dbType, dbConfig);
    const auditService = new AuditService(dbType, dbConfig);
    const workflowEngine = new WorkflowEngine(dbType, dbConfig);

    const username = user.username;

    const { getDbClient } = await import('@/db');
    const db = getDbClient(dbType, dbConfig) as any;
    
    let datasetMode = 'LEGACY_RELATIONAL';
    let targetTable = tableName;
    let unitColumn = 'unit_id';

    if (db.pool) {
       const [rows] = await db.pool.query("SELECT * FROM sys_datasets WHERE is_active = 1 AND status = 'ACTIVE' LIMIT 1");
       if (rows.length > 0) {
          const ds = rows[0];
          datasetMode = ds.dataset_mode;
          if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
             const legacyTables = ['lhp', 'temuan', 'rekomendasi', 'temuan_pengawasan'];
             if (legacyTables.includes(tableName)) {
                 targetTable = ds.table_name;
             }
             const columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
             if (columnMapping && columnMapping.unit) {
                unitColumn = columnMapping.unit.column;
             }
          }
       }
    }

    // Enforce read-only state validation checks before delete
    const isReadOnly = await workflowEngine.isRecordReadOnly(targetTable, numericId);
    if (isReadOnly) {
      return ApiResponse.error(
        'Data ini sedang dalam proses review/persetujuan dan bersifat read-only. Penghapusan tidak diizinkan.',
        null,
        403
      );
    }

    // Enforce Pessimistic Lock check before delete
    const isLockValid = await presenceService.verifyLockForWrite(targetTable, numericId, username);
    if (!isLockValid) {
      return ApiResponse.error('Data sedang dikunci oleh pengguna lain. Tidak dapat dihapus.', null, 423);
    }

    // Fetch existing record details for event
    let oldRecord: any = null;
    try {
      oldRecord = await recordService.findRecordById(targetTable, numericId);
    } catch (e) {
      console.error('Failed to capture deleted record details:', e);
    }

    if (user.accessScope === 'OWN_UNIT' && user.unitId) {
      if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
         if (!oldRecord || oldRecord[unitColumn] !== user.unitKode) return ApiResponse.error('Access denied: Record belongs to another unit', null, 403);
      } else {
        if (targetTable === 'lhp') {
          if (!oldRecord || oldRecord.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
        } else if (targetTable === 'temuan' || targetTable === 'temuan_pengawasan') {
          const lhp = await recordService.findRecordById('lhp', oldRecord.id_lhp);
          if (!lhp || lhp.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
        } else if (targetTable === 'rekomendasi') {
          const temuan = await recordService.findRecordById('temuan', oldRecord.id_temuan);
          if (temuan) {
            const lhp = await recordService.findRecordById('lhp', temuan.id_lhp);
            if (!lhp || lhp.unit_id !== user.unitId) return ApiResponse.error('Access denied: LHP belongs to another unit', null, 403);
          }
        }
      }
    }

    const record = await recordService.deleteRecord(targetTable, numericId);

    // Cleanup lock if it exists
    await presenceService.releaseLock(targetTable, numericId, username);

    // Publish event
    const eventBus = EventBus.getInstance();
    await eventBus.publish(BUSINESS_EVENTS.RECORD_DELETED, {
      tableName: targetTable,
      recordId: numericId,
      username,
      record: oldRecord || record
    });

    // Log to Audit Trail
    await auditService.writeLog({
      action: 'Record Deleted',
      details: `Menghapus baris ID ${numericId} dari tabel '${targetTable}'.`,
      user: username
    });

    return ApiResponse.success(record, 'Record deleted successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to delete record.', error, 500);
  }
});
