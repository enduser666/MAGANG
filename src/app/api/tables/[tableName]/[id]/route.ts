import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tableName: string; id: string }> }
) {
  try {
    const { tableName, id } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const numericId = parseInt(id, 10);

    const record = await db.updateRecord(tableName, numericId, body);

    // Log to Audit Trail
    await db.auditLogs.create({
      action: 'Record Updated',
      details: `Mengubah baris ID ${numericId} di tabel '${tableName}'.`,
      user: 'Data Analyst'
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update record.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableName: string; id: string }> }
) {
  try {
    const { tableName, id } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const numericId = parseInt(id, 10);
    const record = await db.deleteRecord(tableName, numericId);

    // Log to Audit Trail
    await db.auditLogs.create({
      action: 'Record Deleted',
      details: `Menghapus baris ID ${numericId} dari tabel '${tableName}'.`,
      user: 'Data Analyst'
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete record.' },
      { status: 500 }
    );
  }
}
