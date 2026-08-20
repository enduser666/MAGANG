import { ApiResponse } from '@/lib/api-response';
import { NotificationService, initializeNotifListenersForDb } from '@/services/NotificationService';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    
    // Dynamically initialize the event subscribers for this database
    initializeNotifListenersForDb(dbType, dbConfig);

    const service = new NotificationService(dbType, dbConfig);
    const notifications = await service.listUserNotifications(user.username);

    return ApiResponse.success(notifications, 'Notifications listed successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const service = new NotificationService(dbType, dbConfig);

    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return ApiResponse.error('notificationIds array is required.', null, 400);
    }

    await service.markRead(notificationIds);

    return ApiResponse.success(null, 'Notifications marked as read.');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
