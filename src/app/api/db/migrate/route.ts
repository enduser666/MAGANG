import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dbType, dbConfig, action, records, fileName, fileSize, duplicatesCount, missingValuesCount } = body;
    const db = getDbClient(dbType, dbConfig);

    if (action === 'initialize') {
      const initResult = await db.initializeSchema();
      if (initResult.success) {
        await db.auditLogs.create({
          action: 'SCHEMA_INITIALIZATION',
          details: `Successfully initialized database schema tables for ${dbType === 'mysql' ? 'MySQL' : 'Sandbox'} db.`,
          user: 'System Administrator',
        });
      }
      return NextResponse.json(initResult);
    }

    if (action === 'migrate') {
      if (!records || !Array.isArray(records)) {
        return NextResponse.json({ success: false, message: 'Invalid records format' }, { status: 400 });
      }

      // Execute migration
      const result = await db.episodes.createMany(records);

      const status = result.failedCount === 0 ? 'SUCCESS' : result.successCount > 0 ? 'PARTIAL' : 'FAILED';

      // Log to Import History
      await db.importHistory.create({
        fileName: fileName || 'unknown_file.csv',
        fileSize: fileSize || 0,
        status,
        totalRecords: records.length,
        migratedRecords: result.successCount,
        failedRecords: result.failedCount,
        duplicatesCount: duplicatesCount || 0,
        missingValuesCount: missingValuesCount || 0,
      });

      // Log to Audit Log
      await db.auditLogs.create({
        action: 'EXECUTE_MIGRATION',
        details: `Migrated ${result.successCount} of ${records.length} records. Status: ${status}. Errors: ${result.failedCount}.`,
        user: 'Data Analyst',
      });

      return NextResponse.json({
        success: true,
        migrated: result.successCount,
        failed: result.failedCount,
        status,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
