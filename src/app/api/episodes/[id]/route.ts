import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID format' }, { status: 400 });
    }

    const updated = await db.episodes.update(recordId, {
      season: parseInt(body.season, 10),
      title: body.title,
      summary: body.summary || '',
      rating: parseFloat(body.rating || '0'),
      votes: parseInt(body.votes || '0', 10),
      viewership: parseFloat(body.viewership || '0'),
      duration: parseInt(body.duration || '0', 10),
      releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
      guestStars: body.guestStars || null,
      director: body.director || 'Unknown',
      writers: body.writers || 'Unknown',
    });

    await db.auditLogs.create({
      action: 'UPDATE_RECORD',
      details: `Updated episode ID ${id}: "${body.title}"`,
      user: 'Data Analyst',
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const recordId = parseInt(id, 10);
    if (isNaN(recordId)) {
      return NextResponse.json({ success: false, message: 'Invalid ID format' }, { status: 400 });
    }

    const deleted = await db.episodes.delete(recordId);

    await db.auditLogs.create({
      action: 'DELETE_RECORD',
      details: `Deleted episode ID ${id}: "${deleted.title}"`,
      user: 'Data Analyst',
    });

    return NextResponse.json({ success: true, data: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
