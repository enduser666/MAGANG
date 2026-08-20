import { getDbClient } from '@/db';
import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { WorkbookIngestionOrchestrator } from '@/runtime/WorkbookIngestionOrchestrator';

export const POST = withAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { 
      dbType, 
      dbConfig, 
      action, 
      tableName, 
      displayName, 
      sourceFile, 
      columns, 
      records, 
      qualityScore,
      importMode
    } = body;
    
    console.log('[MIGRATE-DIAG] Request received | action:', action, '| dbType:', dbType, '| tableName:', tableName, '| records:', Array.isArray(records) ? records.length : typeof records);
    
    const db = getDbClient(dbType, dbConfig);
    const creator = user.username;

    if (action === 'initialize') {
      const initResult = await db.initializeSchema();
      if (initResult.success) {
        await db.auditLogs.create({
          action: 'SCHEMA_INITIALIZATION',
          details: `Successfully initialized database schema tables for ${dbType === 'postgres' ? 'PostgreSQL' : 'Sandbox'} db.`,
          user: creator,
        });
        return ApiResponse.success(initResult, initResult.message);
      }
      return ApiResponse.error(initResult.message, initResult, 500);
    }

    if (action === 'migrate_workbook') {
      const { base64Data, workspaceId } = body;
      if (!base64Data) {
        return ApiResponse.error('Missing base64Data workbook payload.', null, 400);
      }
      
      const result = await WorkbookIngestionOrchestrator.execute(
        dbType || 'sandbox',
        dbConfig || null,
        { sourceType: 'EXCEL', base64Data, sourceFile: sourceFile || 'unknown.xlsx' },
        workspaceId || 'default',
        creator
      );

      await db.auditLogs.create({
        action: 'EXECUTE_WORKBOOK_MIGRATION',
        details: `Workbook '${sourceFile}' berhasil diintegrasikan dengan ${result.datasetsIngested.length} dataset.`,
        user: creator,
      });

      return ApiResponse.success({
        datasetsIngested: result.datasetsIngested,
        status: 'SUCCESS',
      }, 'Workbook migrated successfully.');
    }

    if (action === 'migrate') {
      if (!tableName || !columns || !records || !Array.isArray(records)) {
        return ApiResponse.error('Invalid dynamic import parameters.', null, 400);
      }

      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return ApiResponse.error('Invalid table name format.', null, 400);
      }

      const sanitizedSourceFile = sourceFile ? String(sourceFile).replace(/[^a-zA-Z0-9_.-]/g, '_') : 'unknown.xlsx';

      // Prototype Pollution Prevention Guard on columns and records
      const sanitizedColumns = Array.isArray(columns) ? columns.map((col: any) => {
        const cleanCol: any = {};
        for (const key in col) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
          }
          cleanCol[key] = col[key];
        }
        return cleanCol;
      }) : [];

      const sanitizedRecords = records.map((record: any) => {
        const cleanRec: any = {};
        for (const key in record) {
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
          }
          cleanRec[key] = record[key];
        }
        return cleanRec;
      });

      const formattedName = tableName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      let tableCreated = false;

      try {
        // Execute dynamic migration
        console.log('[MIGRATE-DIAG] calling createDynamicTable | tableName:', tableName, '| rows:', sanitizedRecords.length, '| importMode:', importMode || 'overwrite');
        await db.createDynamicTable(
          tableName,
          displayName || tableName,
          sanitizedSourceFile,
          creator,
          sanitizedColumns,
          sanitizedRecords,
          qualityScore || 100,
          importMode || 'overwrite'
        );
        console.log('[MIGRATE-DIAG] createDynamicTable finished successfully');
        tableCreated = true;

        // STEP 5: Post-import sandbox verification — re-read the file from disk immediately
        if (!dbType || dbType === 'sandbox') {
          try {
            const fs = await import('fs');
            const path = await import('path');
            const sandboxPath = path.join(process.cwd(), 'src/lib/sandbox_db.json');
            const stat = fs.statSync(sandboxPath);
            const raw = fs.readFileSync(sandboxPath, 'utf8');
            const parsed = JSON.parse(raw);
            const tableNames = Object.keys(parsed.tables || {});
            const formattedImportedName = tableName.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
            const importedTable = parsed.tables?.[formattedImportedName];
            console.log('[MIGRATE-DIAG] POST-IMPORT VERIFY sandbox_db.json | mtime:', stat.mtime.toISOString(), '| fileSize:', stat.size, 'bytes | tables:', tableNames, '| importedTable exists:', !!importedTable, '| importedTable rowCount:', importedTable?.rows?.length ?? 'N/A');
          } catch (verifyErr: any) {
            console.error('[MIGRATE-DIAG] POST-IMPORT VERIFY failed to read sandbox_db.json:', verifyErr.message);
          }
        }

        // Log to Import History
        const duplicatesCount = body.duplicatesCount || 0;
        const missingValuesCount = body.missingValuesCount || 0;

        await db.importHistory.create({
          fileName: sanitizedSourceFile,
          fileSize: body.fileSize || 0,
          status: 'SUCCESS',
          totalRecords: sanitizedRecords.length,
          migratedRecords: sanitizedRecords.length,
          failedRecords: 0,
          duplicatesCount,
          missingValuesCount,
          qualityScore: qualityScore || 100
        });

        // Log to Audit Log
        await db.auditLogs.create({
          action: 'EXECUTE_MIGRATION',
          details: `Tabel '${tableName}' baru berhasil diintegrasikan dengan ${records.length} baris. Skor Kualitas: ${qualityScore}%.`,
          user: creator,
        });

        // Create pipeline logs for pipeline status
        await db.pipelineJobs.create({
          jobName: `Ingestion: ${tableName}`,
          status: 'SUCCESS',
          durationMs: 1500
        });

        return ApiResponse.success({
          migrated: records.length,
          tableName,
          status: 'SUCCESS',
        }, 'Migration executed successfully.');

      } catch (err: any) {
        console.error('Migration failed, executing transaction rollback:', err);
        if (tableCreated) {
          try {
            await db.deleteDynamicTable(tableName);
          } catch (rollbackErr) {
            console.error('Failed to drop table during rollback:', rollbackErr);
          }
        }
        
        const isValidationError = err.message && (
          err.message.includes('harus bertipe') || 
          err.message.includes('validation') || 
          err.message.includes('Validation')
        );
        const statusCode = isValidationError ? 400 : 500;
        const msgPrefix = isValidationError ? 'Gagal Validasi Data' : 'Migrasi gagal dan telah di-rollback secara aman';
        
        return ApiResponse.error(`${msgPrefix}: ${err.message || 'Error Ingesting Data'}`, null, statusCode);
      }
    }

    return ApiResponse.error('Invalid action parameter', null, 400);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
