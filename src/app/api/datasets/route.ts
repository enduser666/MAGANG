import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { getDbClient } from '@/db';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig) as any;
    
    // Attempt native MySQL first if using mysql
    if (db.pool) {
       const [rows] = await db.pool.query('SELECT * FROM sys_datasets ORDER BY imported_at DESC');
       return ApiResponse.success(rows, 'Datasets fetched successfully');
    }
    
    return ApiResponse.error('Not implemented for Sandbox', null, 501);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Error fetching datasets', error, 500);
  }
});
