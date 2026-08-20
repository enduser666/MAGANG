import { ApiResponse } from '@/lib/api-response';
import { NavigationService } from '@/runtime/NavigationService';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');

    const service = new NavigationService(dbType, dbConfig);
    const data = await service.getNavigation();

    return ApiResponse.success(data, 'Navigation hierarchy loaded successfully.');
  } catch (error: any) {
    console.error('Failed to load navigation structure:', error);
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
