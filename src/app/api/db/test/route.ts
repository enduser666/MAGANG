import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dbType, dbConfig } = body;
    const db = getDbClient(dbType, dbConfig);
    const result = await db.testConnection();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
