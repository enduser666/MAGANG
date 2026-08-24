import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const reqs = await db.accessRequests.findMany();
    return ApiResponse.success(reqs, 'Access requests listed successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to list access requests.', error, 500);
  }
});

export const POST = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const req = await db.accessRequests.create({
      username: body.username,
      requestedRole: body.requestedRole
    });

    return ApiResponse.success(req, 'Access request created successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to create access request.', error, 500);
  }
});

export const PUT = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    const body = await request.json();
    const { id, status } = body;

    const req = await db.accessRequests.updateStatus(id, status);

    // Log to Audit Trail
    await db.auditLogs.create({
      action: 'Access Request Approved/Rejected',
      details: `Permintaan akses peran '${req.requestedRole}' oleh '${req.username}' diubah status menjadi ${status}.`,
      user: user.username
    });

    return ApiResponse.success(req, 'Access request status updated successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to update access request status.', error, 500);
  }
});
