import { WorkflowRepository } from '@/repositories/WorkflowRepository';
import { EventBus, BUSINESS_EVENTS } from '@/services/EventBus';

export const WORKFLOW_STATES = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  REVISION_REQUESTED: 'Revision Requested',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived'
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  [WORKFLOW_STATES.DRAFT]: [WORKFLOW_STATES.SUBMITTED],
  [WORKFLOW_STATES.SUBMITTED]: [WORKFLOW_STATES.UNDER_REVIEW, WORKFLOW_STATES.DRAFT],
  [WORKFLOW_STATES.UNDER_REVIEW]: [WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REVISION_REQUESTED],
  [WORKFLOW_STATES.REVISION_REQUESTED]: [WORKFLOW_STATES.SUBMITTED],
  [WORKFLOW_STATES.APPROVED]: [WORKFLOW_STATES.PUBLISHED],
  [WORKFLOW_STATES.PUBLISHED]: [WORKFLOW_STATES.ARCHIVED],
  [WORKFLOW_STATES.ARCHIVED]: []
};

export class WorkflowEngine {
  private workflowRepo: WorkflowRepository;

  constructor(dbType: string = 'sandbox', dbConfig: string | null = null) {
    this.workflowRepo = new WorkflowRepository(dbType, dbConfig);
  }

  public static isTransitionAllowed(currentState: string, targetState: string): boolean {
    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    return allowed.includes(targetState);
  }

  public isRoleAllowedForTransition(role: string, targetState: string, currentState: string): boolean {
    const cleanRole = role.toLowerCase();
    
    // Administrator can bypass any constraint
    if (cleanRole === 'administrator' || cleanRole === 'admin') return true;

    if (targetState === WORKFLOW_STATES.SUBMITTED) {
      return cleanRole.includes('eselon i') || cleanRole.includes('staff') || cleanRole.includes('supervisor');
    }
    
    if (targetState === WORKFLOW_STATES.DRAFT && currentState === WORKFLOW_STATES.SUBMITTED) {
      // Submitter cancelling their submission
      return cleanRole.includes('eselon i') || cleanRole.includes('staff');
    }

    if (targetState === WORKFLOW_STATES.UNDER_REVIEW || targetState === WORKFLOW_STATES.REVISION_REQUESTED || targetState === WORKFLOW_STATES.APPROVED) {
      return cleanRole.includes('itjen') || cleanRole.includes('auditor') || cleanRole.includes('inspector');
    }

    if (targetState === WORKFLOW_STATES.PUBLISHED || targetState === WORKFLOW_STATES.ARCHIVED) {
      return cleanRole.includes('itjen') || cleanRole.includes('inspector');
    }

    return false;
  }

  async executeTransition(
    tableName: string,
    recordId: number,
    targetState: string,
    user: { username: string; role: string; fullName: string }
  ) {
    const info = await this.workflowRepo.getRecordWorkflowStatus(tableName, recordId);
    if (!info) {
      throw new Error(`Record with ID ${recordId} in table ${tableName} does not exist.`);
    }

    const currentState = info.status;

    // 1. Validate state transition path
    if (!WorkflowEngine.isTransitionAllowed(currentState, targetState)) {
      throw new Error(`Transisi status dari "${currentState}" ke "${targetState}" tidak diperbolehkan.`);
    }

    // 2. Validate user role permissions
    if (!this.isRoleAllowedForTransition(user.role, targetState, currentState)) {
      throw new Error(`Peran "${user.role}" Anda tidak memiliki hak untuk mengubah status data ke "${targetState}".`);
    }

    // 3. Update status in database
    let approvalStatus = 'PENDING';
    if (targetState === WORKFLOW_STATES.APPROVED) {
      approvalStatus = 'APPROVED';
    } else if (targetState === WORKFLOW_STATES.REVISION_REQUESTED) {
      approvalStatus = 'REVISION_REQUESTED';
    } else if (targetState === WORKFLOW_STATES.DRAFT) {
      approvalStatus = 'DRAFT';
    } else if (targetState === WORKFLOW_STATES.PUBLISHED) {
      approvalStatus = 'PUBLISHED';
    } else if (targetState === WORKFLOW_STATES.ARCHIVED) {
      approvalStatus = 'ARCHIVED';
    }

    const updated = await this.workflowRepo.updateWorkflowStatus(tableName, recordId, targetState, approvalStatus);

    // 4. Publish Event
    const eventBus = EventBus.getInstance();
    await eventBus.publish(BUSINESS_EVENTS.REVIEW_COMPLETED, {
      tableName,
      recordId,
      actor: user.username,
      actorFullName: user.fullName,
      oldState: currentState,
      newState: targetState,
      record: updated
    });

    return updated;
  }

  async isRecordReadOnly(tableName: string, recordId: number): Promise<boolean> {
    const info = await this.workflowRepo.getRecordWorkflowStatus(tableName, recordId);
    if (!info) return false;
    // Direct CRUD edits are only allowed if status is Draft or Revision Requested
    return info.status !== WORKFLOW_STATES.DRAFT && info.status !== WORKFLOW_STATES.REVISION_REQUESTED;
  }
}
