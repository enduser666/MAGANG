import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { DatasetRuntime } from '@/runtime/DatasetRuntime';
import { QueryEngine } from '@/runtime/QueryEngine';
import { bootstrapDbListeners } from '@/backend/lib/bootstrap';
import { DatasetMutationRuntime } from '@/runtime/DatasetMutationRuntime';

export const GET = withAuth(async (request, user, { params }) => {
  try {
    const { workspaceId, datasetId } = await params;
    
    // 1 & 2. Validasi ID
    if (!workspaceId || !datasetId) {
      return ApiResponse.error('Workspace ID and Dataset ID are required.', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const runtime = new DatasetRuntime(dbType, dbConfig);
    const engine = new QueryEngine(dbType, dbConfig);

    // 3. Resolve Dataset
    const ds = await runtime.resolveDataset(datasetId);
    if (!ds) {
      return ApiResponse.error(`Dataset '${datasetId}' not found.`, null, 404);
    }

    // 4. Validasi ownership workspace vs dataset
    if (ds.workspaceId !== workspaceId) {
      return ApiResponse.error('Dataset is not registered under the requested workspace.', null, 403);
    }

    // Parse URL params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    // 5. Validasi Page & 6. Validasi Limit
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = !isNaN(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

    const limitRaw = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20', 10);
    const limit = !isNaN(limitRaw) && limitRaw > 0 ? (limitRaw > 100 ? 100 : limitRaw) : 20;

    // 7. Validasi sortOrder
    const sortOrderRaw = searchParams.get('sortDirection') || searchParams.get('sortOrder') || 'desc';
    const sortOrder = sortOrderRaw.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // 8. Validasi sortField
    const sortFieldRaw = searchParams.get('sortBy') || searchParams.get('sortField') || 'id';
    const validColumns = ds.columns.map(c => c.name.toLowerCase());
    
    const isValidSortField = validColumns.includes(sortFieldRaw.toLowerCase()) || sortFieldRaw.toLowerCase() === 'id';
    if (!isValidSortField && sortFieldRaw) {
      return ApiResponse.error(`Invalid sort field: ${sortFieldRaw}`, null, 400);
    }
    const sortField = sortFieldRaw;

    // Build extra where filters
    const where: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      const isSystemParam = ['search', 'sortField', 'sortOrder', 'page', 'limit', 'sortBy', 'sortDirection', 'pageSize'].includes(key);
      if (!isSystemParam && val) {
        // Only accept filters for valid columns
        if (validColumns.includes(key.toLowerCase()) || key.toLowerCase() === 'id') {
          where[key] = val;
        }
      }
    });

    // Execute query via QueryEngine
    const userContext = {
      username: user.username,
      role: user.role
      // satkerCode removed as it is not on UserSession
    };

    const result = await engine.query(datasetId, {
      page,
      limit,
      search,
      sortField,
      sortOrder,
      where
    }, userContext);

    const perm = await runtime.resolvePermissions(datasetId, user.role);
    const userPermissions = perm ? perm.actions : [];

    // Standard ApiResponse matching requested structure
    return ApiResponse.success(
      result.data,
      'Dataset fetched successfully',
      {
        userPermissions,
        metadata: {
          id: ds.id,
          name: ds.displayName,
          workspaceId: ds.workspaceId,
          columns: ds.columns
        },
        pagination: {
          page,
          limit,
          totalRecords: result.total,
          totalPages: Math.ceil(result.total / limit) || 1
        }
      }
    );
  } catch (error: any) {
    console.error('Failed to load dynamic dataset:', error);
    return ApiResponse.error('Failed to load dataset records.', null, 500);
  }
});

export const POST = withAuth(async (request, user, { params }) => {
  try {
    const { workspaceId, datasetId } = await params;
    
    if (!workspaceId || !datasetId) {
      return ApiResponse.error('Workspace ID and Dataset ID are required.', null, 400);
    }

    const payload = await request.json();

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    bootstrapDbListeners(dbType, dbConfig);

    const runtime = new DatasetMutationRuntime(dbType, dbConfig);
    const userContext = { username: user.username, role: user.role };

    // DatasetMutationRuntime.createRecord handles dataset resolution, authorization, validation, db call, and audit logging.
    const createdRecord = await runtime.createRecord(datasetId, payload, userContext);

    return ApiResponse.success(createdRecord, 'Record created successfully', {});
  } catch (error: any) {
    console.error('Failed to create record:', error);
    const status = error.status || 500;
    return ApiResponse.error(error.message || 'Failed to create record.', null, status);
  }
});
