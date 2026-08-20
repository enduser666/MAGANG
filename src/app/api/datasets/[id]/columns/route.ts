import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { getDbClient } from '@/db';

export const GET = withAuth(async (request, user, { params }) => {
  if (user.role !== 'ADMIN_PUSAT') {
    return ApiResponse.error('Hanya Super Admin yang dapat mengakses endpoint ini', null, 403);
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
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
    const meta = await db.getTableMetadata(dataset.table_name);
    
    if (!meta) {
        return ApiResponse.error(`Metadata tidak ditemukan untuk tabel ${dataset.table_name}`, null, 404);
    }

    return ApiResponse.success(meta.columns, 'Kolom dataset berhasil diambil');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Gagal mengambil kolom dataset', error, 500);
  }
});
