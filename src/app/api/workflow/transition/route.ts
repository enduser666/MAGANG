import { ApiResponse } from '@/backend/lib/api-response';
import { getDbClient } from '@/db';
import { WorkflowEngine } from '@/backend/services/WorkflowEngine';
import { UserService } from '@/backend/services/UserService';
import { bootstrapDbListeners } from '@/backend/lib/bootstrap';
import { withAuth } from '@/backend/lib/auth';

export const POST = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const db = getDbClient(dbType, dbConfig);
    const workflowEngine = new WorkflowEngine(dbType, dbConfig);
    const userService = new UserService(dbType, dbConfig);

    const userProfile = await userService.findByUsername(user.username);
    const fullName = userProfile?.fullName || user.username;

    const body = await request.json();
    const { tableName, recordId, targetState } = body;

    if (!tableName || !recordId || !targetState) {
      return ApiResponse.error('tableName, recordId, and targetState are required.', null, 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }

    const numRecordId = Number(recordId);
    if (isNaN(numRecordId) || numRecordId <= 0) {
      return ApiResponse.error('Invalid recordId parameter.', null, 400);
    }

    const updatedRecord = await workflowEngine.executeTransition(
      tableName,
      Number(recordId),
      targetState,
      {
        username: user.username,
        role: user.role,
        fullName
      }
    );

    return ApiResponse.success(updatedRecord, `Berhasil mengubah status data ke "${targetState}".`);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Transition failed.', error, 400);
  }
});
