import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const history = await db.importHistory.findMany();
    const logs = await db.auditLogs.findMany();

    return NextResponse.json({
      success: true,
      history,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    await db.importHistory.clearAll();
    await db.auditLogs.clearAll();

    await db.auditLogs.create({
      action: 'CLEAR_LOGS',
      details: 'Cleared all import history and system audit logs.',
      user: 'System Administrator',
    });

    return NextResponse.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
