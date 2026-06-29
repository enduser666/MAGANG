import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const numericId = parseInt(id, 10);
    const success = await db.dashboardWidgets.delete(numericId);

    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete widget.' },
      { status: 500 }
    );
  }
}
