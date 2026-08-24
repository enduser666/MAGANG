import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { getDbClient } from '@/db';

export const GET = withAuth(async (request, user) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig) as any;
    
    if (db.pool) {
       const [rows] = await db.pool.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
       if (rows.length === 0) {
         return ApiResponse.success(null, 'No active dataset found');
       }
       return ApiResponse.success(rows[0], 'Active dataset fetched successfully');
    }
    
    return ApiResponse.error('Not implemented for Sandbox', null, 501);
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Error fetching active dataset', error, 500);
  }
});
