import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const jobs = await db.pipelineJobs.findMany();
    return ApiResponse.success(jobs, 'Pipeline jobs listed successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to list pipeline jobs.', error, 500);
  }
});

export const POST = withAuth(async (request, user) => {
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

    return ApiResponse.success(job, 'Pipeline job created successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to create pipeline job.', error, 500);
  }
});
