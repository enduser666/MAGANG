import { ApiResponse } from '@/lib/api-response';
import { ImportHistoryService } from '@/services/ImportHistoryService';
import { AuditService } from '@/services/AuditService';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const historyService = new ImportHistoryService(dbType, dbConfig);
    const auditService = new AuditService(dbType, dbConfig);

    const history = await historyService.listImportHistory();
    const logs = await auditService.listAuditLogs();

    return ApiResponse.success({ history, logs }, 'Logs and history fetched successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});

export const DELETE = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const historyService = new ImportHistoryService(dbType, dbConfig);
    const auditService = new AuditService(dbType, dbConfig);

    await historyService.clearHistory();
    await auditService.clearAuditLogs();

    await auditService.writeLog({
      action: 'CLEAR_LOGS',
      details: 'Cleared all import history and system audit logs.',
      user: user.username,
    });

    return ApiResponse.success(null, 'Logs cleared successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
