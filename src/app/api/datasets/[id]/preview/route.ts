import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { getDbClient } from '@/db';
import { AnalyticsService } from '@/services/AnalyticsService';

export const POST = withAuth(async (request, user, { params }) => {
  if (user.role !== 'ADMIN_PUSAT') {
    return ApiResponse.error('Hanya Super Admin yang dapat mengakses endpoint ini', null, 403);
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { columnMapping } = body;
    
    if (!columnMapping) {
      return ApiResponse.error('Parameter columnMapping wajib diisi', null, 400);
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig) as any;
    
    if (!db.pool) {
      return ApiResponse.error('Not implemented for Sandbox', null, 501);
    }
    
    const [dsRows] = await db.pool.query('SELECT * FROM sys_datasets WHERE id = ?', [id]);
    if (dsRows.length === 0) {
       return ApiResponse.error('Dataset tidak ditemukan', null, 404);
    }
    
    const dataset = dsRows[0];
    
    // Create an analytics service instance to fetch data based on the dynamic table and new mapping
    const analyticsService = new AnalyticsService(dbType, dbConfig);
    const data = await analyticsService.getDashboardAnalytics(dataset.table_name, undefined, 'DYNAMIC_FLAT_TABLE', columnMapping);

    return ApiResponse.success(data, 'Preview dashboard berhasil dibuat');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Gagal membuat preview', error, 500);
  }
});
