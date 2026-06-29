import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const tables = await db.listTables();
    return NextResponse.json({ success: true, data: tables });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to list tables.' },
      { status: 500 }
    );
  }
}
