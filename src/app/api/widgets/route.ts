import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const widgets = await db.dashboardWidgets.findMany();
    return NextResponse.json({ success: true, data: widgets });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to list widgets.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const widget = await db.dashboardWidgets.create(body);

    return NextResponse.json({ success: true, data: widget });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create widget.' },
      { status: 500 }
    );
  }
}
