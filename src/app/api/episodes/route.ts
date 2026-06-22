import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || undefined;
    const seasonStr = searchParams.get('season');
    const season = seasonStr ? parseInt(seasonStr, 10) : undefined;
    const director = searchParams.get('director') || undefined;
    const writer = searchParams.get('writer') || undefined;
    const sortField = searchParams.get('sortField') || 'id';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) where.search = search;
    if (season !== undefined && !isNaN(season)) where.season = season;
    if (director) where.director = director;
    if (writer) where.writer = writer;

    const total = await db.episodes.count({ where });
    const records = await db.episodes.findMany({
      where,
      orderBy: { field: sortField, direction: sortOrder },
      skip,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const record = await db.episodes.create({
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
      action: 'CREATE_RECORD',
      details: `Created episode record: "${body.title}" (Season ${body.season})`,
      user: 'Data Analyst',
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    await db.episodes.deleteMany();

    await db.auditLogs.create({
      action: 'CLEAR_DATABASE',
      details: `Cleared all migrated episode records from the database.`,
      user: 'Data Analyst',
    });

    return NextResponse.json({ success: true, message: 'All records deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
