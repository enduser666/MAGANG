import { NextResponse } from 'next/server';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { DashboardRuntime } from '@/runtime/DashboardRuntime';

export const GET = withAuth(async (
  request,
  user,
  { params }: { params: Promise<{ workspaceId: string; datasetId: string }> }
) => {
  try {
    const resolvedParams = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');

    const runtime = new DashboardRuntime(dbType, dbConfig);
    const userContext = { username: user.username, role: user.role };

    // In MVP, we assume the dashboardId is the datasetId for autogeneration.
    const dashboardId = resolvedParams.datasetId;

    const data = await runtime.getDashboard(resolvedParams.workspaceId, dashboardId, userContext);
    
    return ApiResponse.success(data, 'Dashboard loaded successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to load dashboard', error, 500);
  }
});
