import { ApiResponse } from '@/backend/lib/api-response';
import { getDbClient } from '@/db';
import { WorkflowRepository } from '@/repositories/WorkflowRepository';
import { ApprovalRepository } from '@/repositories/ApprovalRepository';
import { WorkflowEngine, WORKFLOW_STATES } from '@/backend/services/WorkflowEngine';
import { bootstrapDbListeners } from '@/backend/lib/bootstrap';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName') || searchParams.get('table');
    const recordId = searchParams.get('recordId');

    if (!tableName || !recordId) {
      return ApiResponse.error('Table name and Record ID are required.', null, 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }

    const numRecordId = Number(recordId);
    if (isNaN(numRecordId) || numRecordId <= 0) {
      return ApiResponse.error('Invalid Record ID parameter.', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const db = getDbClient(dbType, dbConfig);
    const workflowRepo = new WorkflowRepository(dbType, dbConfig);
    const approvalRepo = new ApprovalRepository(dbType, dbConfig);

    const info = await workflowRepo.getRecordWorkflowStatus(tableName, Number(recordId));
    if (!info) {
      return ApiResponse.error('Data record not found.', null, 404);
    }

    const pendingApproval = await approvalRepo.findRequest(tableName, Number(recordId));

    // Determine allowed transitions for the user role
    const allowedTargets = Object.values(WORKFLOW_STATES).filter(state => {
      return WorkflowEngine.isTransitionAllowed(info.status, state) &&
             new WorkflowEngine(dbType, dbConfig).isRoleAllowedForTransition(user.role, state, info.status);
    });

    const response = {
      ...info,
      pendingApprovalId: pendingApproval && pendingApproval.status === 'PENDING' ? pendingApproval.id : null,
      allowedTransitions: allowedTargets,
      isReadOnly: info.status !== WORKFLOW_STATES.DRAFT && info.status !== WORKFLOW_STATES.REVISION_REQUESTED
    };

    return ApiResponse.success(response, 'Record workflow status fetched successfully.');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
