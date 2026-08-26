import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { getDbClient } from '@/db';

export const PUT = withAuth(async (request, user, { params }) => {
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

    const mappingStr = typeof columnMapping === 'string' ? columnMapping : JSON.stringify(columnMapping);
    
    await db.pool.query(`
      UPDATE sys_datasets 
      SET column_mapping = ?
      WHERE id = ?
    `, [mappingStr, id]);

    return ApiResponse.success(null, 'Mapping berhasil disimpan (Belum diaktifkan)');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Gagal menyimpan mapping', error, 500);
  }
});
