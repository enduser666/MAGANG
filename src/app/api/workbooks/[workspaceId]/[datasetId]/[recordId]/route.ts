import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { DatasetMutationRuntime } from '@/runtime/DatasetMutationRuntime';
import { DatasetRuntime } from '@/runtime/DatasetRuntime';
import { getDbClient } from '@/db';
import { bootstrapDbListeners } from '@/lib/bootstrap';

// GET Record
export const GET = withAuth(async (request, user, { params }) => {
  try {
    const { workspaceId, datasetId, recordId } = await params;
    if (!workspaceId || !datasetId || !recordId) {
      return ApiResponse.error('Workspace ID, Dataset ID, and Record ID are required.', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const runtime = new DatasetRuntime(dbType, dbConfig);
    const ds = await runtime.resolveDataset(datasetId);
    if (!ds) return ApiResponse.error(`Dataset '${datasetId}' not found.`, null, 404);
    if (ds.workspaceId !== workspaceId) return ApiResponse.error('Dataset is not registered under the requested workspace.', null, 403);

    const db = getDbClient(dbType, dbConfig);
    const record = await db.findRecordById(ds.physicalTable, parseInt(recordId, 10));
    
    if (!record) {
      return ApiResponse.error(`Record ${recordId} not found.`, null, 404);
    }

    // Role filtering (simple mask check similar to QueryEngine could be added here if needed, but usually read endpoint might fetch raw for editing forms)
    // We assume if they have access to dataset, they can read the record. 
    return ApiResponse.success(record, 'Record fetched successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to fetch record.', null, error.status || 500);
  }
});

// PUT Record
export const PUT = withAuth(async (request, user, { params }) => {
  try {
    const { workspaceId, datasetId, recordId } = await params;
    if (!workspaceId || !datasetId || !recordId) {
      return ApiResponse.error('Workspace ID, Dataset ID, and Record ID are required.', null, 400);
    }

    const payload = await request.json();

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const runtime = new DatasetMutationRuntime(dbType, dbConfig);
    const userContext = { username: user.username, role: user.role };

    const dsRuntime = new DatasetRuntime(dbType, dbConfig);
    const ds = await dsRuntime.resolveDataset(datasetId);
    if (ds && ds.workspaceId !== workspaceId) return ApiResponse.error('Dataset is not registered under the requested workspace.', null, 403);

    const updatedRecord = await runtime.updateRecord(datasetId, parseInt(recordId, 10), payload, userContext);
    return ApiResponse.success(updatedRecord, 'Record updated successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to update record.', null, error.status || 500);
  }
});

// DELETE Record
export const DELETE = withAuth(async (request, user, { params }) => {
  try {
    const { workspaceId, datasetId, recordId } = await params;
    if (!workspaceId || !datasetId || !recordId) {
      return ApiResponse.error('Workspace ID, Dataset ID, and Record ID are required.', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const runtime = new DatasetMutationRuntime(dbType, dbConfig);
    const userContext = { username: user.username, role: user.role };

    const dsRuntime = new DatasetRuntime(dbType, dbConfig);
    const ds = await dsRuntime.resolveDataset(datasetId);
    if (ds && ds.workspaceId !== workspaceId) return ApiResponse.error('Dataset is not registered under the requested workspace.', null, 403);

    const success = await runtime.deleteRecord(datasetId, parseInt(recordId, 10), userContext);
    
    if (success) {
      return ApiResponse.success({ id: recordId }, 'Record deleted successfully');
    } else {
      return ApiResponse.error('Failed to delete record. It may not exist.', null, 404);
    }
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to delete record.', null, error.status || 500);
  }
});
