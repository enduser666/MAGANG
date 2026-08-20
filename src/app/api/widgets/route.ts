import { getDbClient } from '@/db';
import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const widgets = await db.dashboardWidgets.findMany();
    return ApiResponse.success(widgets, 'Widgets listed successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to list widgets.', error, 500);
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const widget = await db.dashboardWidgets.create(body);

    return ApiResponse.success(widget, 'Widget created successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to create widget.', error, 500);
  }
});
