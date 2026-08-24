import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';

export const DELETE = withAuth(async (request, user, { params }) => {
  try {
    const { id } = await params;
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId) || numericId <= 0) {
      return ApiResponse.error('Invalid ID parameter.', null, 400);
    }
    const success = await db.dashboardWidgets.delete(numericId);

    if (!success) {
      return ApiResponse.error('Widget not found or could not be deleted.', null, 404);
    }

    return ApiResponse.success({ success }, 'Widget deleted successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to delete widget.', error, 500);
  }
});
