import { ApiResponse } from '@/backend/lib/api-response';
import { ActivityFeedService, initializeActivityListenersForDb } from '@/backend/services/ActivityFeedService';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');

    // Register event listeners dynamically for the active database config
    initializeActivityListenersForDb(dbType, dbConfig);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const service = new ActivityFeedService(dbType, dbConfig);
    const feed = await service.listTimeline(limit);

    return ApiResponse.success(feed, 'Activity timeline fetched successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
