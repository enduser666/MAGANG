import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // Retrieve URL query params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const sortField = searchParams.get('sortField') || undefined;
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Dynamic field filtering: any other query param that is not system parameter is treated as field filter
    const where: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      if (!['search', 'sortField', 'sortOrder', 'page', 'limit'].includes(key) && val) {
        where[key] = val;
      }
    });

    const meta = await db.getTableMetadata(tableName);
    if (!meta) {
      return NextResponse.json({ success: false, message: `Table '${tableName}' not found.` }, { status: 404 });
    }

    const { data, total } = await db.findRecords(tableName, {
      search,
      sortField,
      sortOrder,
      page,
      limit,
      where
    });

    return NextResponse.json({
      success: true,
      metadata: meta,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch table records.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const record = await db.createRecord(tableName, body);

    // Log to Audit Trail
    await db.auditLogs.create({
      action: 'Record Inserted',
      details: `Menambahkan baris baru dengan ID ${record.id} di tabel '${tableName}'.`,
      user: 'Data Analyst'
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create record.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const { tableName } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const success = await db.deleteDynamicTable(tableName);
    if (!success) {
      return NextResponse.json({ success: false, message: `Table '${tableName}' could not be deleted.` }, { status: 400 });
    }

    // Log to Audit Trail
    await db.auditLogs.create({
      action: 'Table Deleted',
      details: `Menghapus tabel dinamis '${tableName}' dari database.`,
      user: 'Administrator'
    });

    return NextResponse.json({ success: true, message: `Table '${tableName}' deleted successfully.` });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete table.' },
      { status: 500 }
    );
  }
}
