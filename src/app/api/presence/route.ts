import { ApiResponse } from '@/lib/api-response';
import { PresenceService } from '@/services/PresenceService';
import { bootstrapDbListeners } from '@/lib/bootstrap';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);
    
    const service = new PresenceService(dbType, dbConfig);

    const body = await request.json();
    const { tableName, recordId, action } = body;

    if (!tableName || !recordId) {
      return ApiResponse.error('Table name and Record ID are required.', null, 400);
    }

    if (action === 'lock') {
      const res = await service.acquireLock(tableName, Number(recordId), user.username);
      if (!res.success) {
        return ApiResponse.error(res.message || 'Failed to acquire lock.', res.lock, 409);
      }
      return ApiResponse.success(res.lock, 'Lock acquired successfully.');
    }

    if (action === 'heartbeat') {
      const res = await service.heartbeat(tableName, Number(recordId), user.username);
      if (!res.success) {
        return ApiResponse.error(res.message || 'Heartbeat lock validation failed.', res.lock, 409);
      }
      return ApiResponse.success(res.lock, 'Heartbeat processed successfully.');
    }

    return ApiResponse.error('Invalid presence action.', null, 400);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const service = new PresenceService(dbType, dbConfig);

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');

    if (!tableName || !recordId) {
      return ApiResponse.error('Table name and Record ID are required.', null, 400);
    }

    const res = await service.releaseLock(tableName, Number(recordId), user.username);
    if (!res.success) {
      return ApiResponse.error(res.message || 'Failed to release lock.', null, 400);
    }

    return ApiResponse.success(null, 'Lock released successfully.');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
