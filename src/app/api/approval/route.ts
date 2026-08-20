import { ApiResponse } from '@/lib/api-response';
import { getDbClient } from '@/db';
import { ApprovalRepository } from '@/repositories/ApprovalRepository';
import { WorkflowEngine, WORKFLOW_STATES } from '@/services/WorkflowEngine';
import { EventBus, BUSINESS_EVENTS } from '@/services/EventBus';
import { UserService } from '@/services/UserService';
import { bootstrapDbListeners } from '@/lib/bootstrap';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const repo = new ApprovalRepository(dbType, dbConfig);

    const requests = await repo.findMany();
    return ApiResponse.success(requests, 'Approval requests fetched successfully.');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});

export const POST = withAuth(async (request, user, { params }) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const repo = new ApprovalRepository(dbType, dbConfig);
    const workflowEngine = new WorkflowEngine(dbType, dbConfig);
    const userService = new UserService(dbType, dbConfig);

    const userProfile = await userService.findByUsername(user.username);
    const fullName = userProfile?.fullName || user.username;

    const body = await request.json();
    const { tableName, recordId, comments } = body;

    if (!tableName || !recordId) {
      return ApiResponse.error('tableName and recordId are required.', null, 400);
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return ApiResponse.error('Invalid table name format.', null, 400);
    }

    const numRecordId = Number(recordId);
    if (isNaN(numRecordId) || numRecordId <= 0) {
      return ApiResponse.error('Invalid recordId parameter.', null, 400);
    }

    // 1. Check if approval request is already pending
    const existing = await repo.findRequest(tableName, Number(recordId));
    if (existing && existing.status === 'PENDING') {
      return ApiResponse.error('Pengajuan persetujuan untuk data ini sudah aktif.', null, 400);
    }

    // 2. Perform workflow status transition to "Submitted"
    await workflowEngine.executeTransition(tableName, Number(recordId), WORKFLOW_STATES.SUBMITTED, {
      username: user.username,
      role: user.role,
      fullName
    });

    // 3. Register the approval request entry
    const approvalRequest = await repo.createRequest(tableName, Number(recordId), user.username, comments);

    // 4. Update dynamic record approval status metadata
    await repo.appendRecordApprovalHistory(tableName, Number(recordId), {
      user: user.username,
      action: 'SUBMIT_FOR_APPROVAL',
      comments,
      timestamp: new Date().toISOString()
    });

    // 5. Publish Event to EventBus
    const eventBus = EventBus.getInstance();
    await eventBus.publish(BUSINESS_EVENTS.APPROVAL_REQUESTED, {
      tableName,
      recordId,
      requester: user.username,
      comments
    });

    return ApiResponse.success(approvalRequest, 'Persetujuan data berhasil diajukan.');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to submit approval.', error, 400);
  }
});

export const PUT = withAuth(async (request, user, { params }) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const repo = new ApprovalRepository(dbType, dbConfig);
    const workflowEngine = new WorkflowEngine(dbType, dbConfig);
    const userService = new UserService(dbType, dbConfig);

    const userProfile = await userService.findByUsername(user.username);
    const fullName = userProfile?.fullName || user.username;

    const body = await request.json();
    const { requestId, decision, comments } = body;

    if (!requestId || !decision) {
      return ApiResponse.error('requestId and decision (APPROVED or REJECTED) are required.', null, 400);
    }

    const numRequestId = Number(requestId);
    if (isNaN(numRequestId) || numRequestId <= 0) {
      return ApiResponse.error('Invalid requestId parameter.', null, 400);
    }

    if (decision !== 'APPROVED' && decision !== 'REJECTED') {
      return ApiResponse.error('Decision must be APPROVED or REJECTED.', null, 400);
    }

    const approvalReq = await repo.findRequestById(Number(requestId));
    if (!approvalReq) {
      return ApiResponse.error('Pengajuan persetujuan tidak ditemukan.', null, 404);
    }

    if (approvalReq.status !== 'PENDING') {
      return ApiResponse.error('Pengajuan persetujuan ini sudah ditindaklanjuti.', null, 400);
    }

    const { tableName, recordId } = approvalReq;
    const targetState = decision === 'APPROVED' ? WORKFLOW_STATES.APPROVED : WORKFLOW_STATES.REVISION_REQUESTED;

    // 1. Perform workflow state transition
    await workflowEngine.executeTransition(tableName, Number(recordId), targetState, {
      username: user.username,
      role: user.role,
      fullName
    });

    // 2. Update status in approvals registry table
    const updatedRequest = await repo.updateRequest(Number(requestId), decision, user.username, comments);

    // 3. Append to record history log
    await repo.appendRecordApprovalHistory(tableName, Number(recordId), {
      user: user.username,
      action: decision,
      comments,
      timestamp: new Date().toISOString()
    });

    return ApiResponse.success(updatedRequest, `Persetujuan berhasil diproses dengan keputusan: "${decision}".`);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to submit decision.', error, 400);
  }
});
