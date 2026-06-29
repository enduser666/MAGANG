import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      dbType, 
      dbConfig, 
      action, 
      tableName, 
      displayName, 
      sourceFile, 
      creator, 
      columns, 
      records, 
      qualityScore,
      importMode
    } = body;
    
    const db = getDbClient(dbType, dbConfig);

    if (action === 'initialize') {
      const initResult = await db.initializeSchema();
      if (initResult.success) {
        await db.auditLogs.create({
          action: 'SCHEMA_INITIALIZATION',
          details: `Successfully initialized database schema tables for ${dbType === 'postgres' ? 'PostgreSQL' : 'Sandbox'} db.`,
          user: 'System Administrator',
        });
      }
      return NextResponse.json(initResult);
    }

    if (action === 'migrate') {
      if (!tableName || !columns || !records || !Array.isArray(records)) {
        return NextResponse.json({ success: false, message: 'Invalid dynamic import parameters.' }, { status: 400 });
      }

      // Execute dynamic migration
      const result = await db.createDynamicTable(
        tableName,
        displayName || tableName,
        sourceFile || 'unknown.xlsx',
        creator || 'Data Analyst',
        columns,
        records,
        qualityScore || 100,
        importMode || 'overwrite'
      );

      // Log to Import History
      const duplicatesCount = body.duplicatesCount || 0;
      const missingValuesCount = body.missingValuesCount || 0;

      await db.importHistory.create({
        fileName: sourceFile || 'unknown_file.xlsx',
        fileSize: body.fileSize || 0,
        status: 'SUCCESS',
        totalRecords: records.length,
        migratedRecords: records.length,
        failedRecords: 0,
        duplicatesCount,
        missingValuesCount,
        qualityScore: qualityScore || 100
      });

      // Log to Audit Log
      await db.auditLogs.create({
        action: 'EXECUTE_MIGRATION',
        details: `Tabel '${tableName}' baru berhasil diintegrasikan dengan ${records.length} baris. Skor Kualitas: ${qualityScore}%.`,
        user: creator || 'Data Analyst',
      });

      // Create pipeline logs for pipeline status
      await db.pipelineJobs.create({
        jobName: `Ingestion: ${tableName}`,
        status: 'SUCCESS',
        durationMs: 1500
      });

      return NextResponse.json({
        success: true,
        migrated: records.length,
        tableName,
        status: 'SUCCESS',
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action parameter' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
