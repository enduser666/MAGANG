import { ApiResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { getDbClient } from '@/db';
import { NextRequest } from 'next/server';

export const GET = withAuth(async (request, user, { params }) => {
  if (user.role !== 'ADMIN_PUSAT') {
    return ApiResponse.error('Hanya Super Admin yang dapat mengakses endpoint ini', null, 403);
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const column = searchParams.get('column');

    if (!column) {
      return ApiResponse.error('Parameter column wajib diisi', null, 400);
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
    const meta = await db.getTableMetadata(dataset.table_name);
    
    if (!meta) {
        return ApiResponse.error(`Metadata tidak ditemukan untuk tabel ${dataset.table_name}`, null, 404);
    }

    // Validate if column exists
    const columnExists = meta.columns.some((c: any) => c.name === column);
    if (!columnExists) {
      return ApiResponse.error(`Kolom '${column}' tidak ditemukan pada tabel dataset`, null, 400);
    }

    // Use MySQLAdapter's validateIdentifier to sanitize names before querying
    db.validateIdentifier(dataset.table_name);
    db.validateIdentifier(column);

    const LIMIT = 500;
    const countQuery = `SELECT COUNT(DISTINCT ?? ) as total, SUM(CASE WHEN ?? IS NULL THEN 1 ELSE 0 END) as nullCount FROM ??`;
    const [countRows] = await db.pool.query(countQuery, [column, column, dataset.table_name]);
    const totalDistinct = Number(countRows[0].total || 0);
    const nullCount = Number(countRows[0].nullCount || 0);

    let values: string[] = [];
    let truncated = false;

    if (totalDistinct > LIMIT) {
      truncated = true;
      // You may fetch top 500, or just return empty values when truncated
      const [valRows] = await db.pool.query(`SELECT DISTINCT ?? as val FROM ?? WHERE ?? IS NOT NULL LIMIT ?`, [column, dataset.table_name, column, LIMIT]);
      values = valRows.map((r: any) => String(r.val));
    } else {
      const [valRows] = await db.pool.query(`SELECT DISTINCT ?? as val FROM ?? WHERE ?? IS NOT NULL`, [column, dataset.table_name, column]);
      values = valRows.map((r: any) => String(r.val));
    }

    return ApiResponse.success({
      values,
      totalDistinct,
      nullCount,
      truncated
    }, 'Nilai unik berhasil diambil');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Gagal mengambil nilai unik', error, 500);
  }
});
