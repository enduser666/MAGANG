import { NextResponse } from 'next/server';
import { getDbClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const jobs = await db.pipelineJobs.findMany();
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to list pipeline jobs.' },
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
    const job = await db.pipelineJobs.create({
      jobName: body.jobName,
      status: body.status,
      durationMs: body.durationMs || 0
    });

    return NextResponse.json({ success: true, data: job });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create pipeline job.' },
      { status: 500 }
    );
  }
}
