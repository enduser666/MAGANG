import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const reqs = await db.accessRequests.findMany();
    return NextResponse.json({ success: true, data: reqs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to list access requests.' },
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
    const req = await db.accessRequests.create({
      username: body.username,
      requestedRole: body.requestedRole
    });

    return NextResponse.json({ success: true, data: req });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create access request.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const { id, status } = body;

    const req = await db.accessRequests.updateStatus(id, status);

    // Log to Audit Trail
    await db.auditLogs.create({
      action: 'Access Request Approved/Rejected',
      details: `Permintaan akses peran '${req.requestedRole}' oleh '${req.username}' diubah status menjadi ${status}.`,
      user: 'Administrator'
    });

    return NextResponse.json({ success: true, data: req });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update access request status.' },
      { status: 500 }
    );
  }
}
