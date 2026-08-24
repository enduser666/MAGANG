import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { getDbClient } from '@/db';

export const PUT = withAuth(async (request, user, { params }) => {
  if (user.role !== 'ADMIN_PUSAT') {
    return ApiResponse.error('Hanya Super Admin yang dapat mengaktifkan dataset', null, 403);
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { columnMapping } = body;
    
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig) as any;
    
    if (!db.pool) {
      return ApiResponse.error('Not implemented for Sandbox', null, 501);
    }
    
    const connection = await db.pool.getConnection();
    
    try {
      const [dsRows] = await connection.query('SELECT * FROM sys_datasets WHERE id = ?', [id]);
      if (dsRows.length === 0) {
         return ApiResponse.error('Dataset tidak ditemukan', null, 404);
      }
      
      const targetDataset = dsRows[0];
      
      if (targetDataset.dataset_mode === 'DYNAMIC_FLAT_TABLE') {
        const mappingToUse = columnMapping || targetDataset.column_mapping;
        if (!mappingToUse) {
           throw new Error('Column mapping tidak ditemukan atau belum diset.');
        }
        
        try {
          const [cols] = await connection.query('SHOW COLUMNS FROM ??', [targetDataset.table_name]);
          const existingColNames = (cols as any[]).map(c => c.Field);
          
          const mappingObj = typeof mappingToUse === 'string' ? JSON.parse(mappingToUse) : mappingToUse;
          
          for (const key in mappingObj) {
            const mappedCol = mappingObj[key].column;
            if (mappedCol && !existingColNames.includes(mappedCol)) {
              throw new Error(`Kolom '${mappedCol}' tidak ditemukan di tabel fisik '${targetDataset.table_name}'`);
            }
          }

          if (mappingObj.unit && mappingObj.unit.column) {
            const unitCol = mappingObj.unit.column;
            const [distinctUnits] = await connection.query(`SELECT DISTINCT ?? as val FROM ?? WHERE ?? IS NOT NULL`, [unitCol, targetDataset.table_name, unitCol]);
            
            const [validUnits] = await connection.query('SELECT kode_unit FROM sys_units');
            const validCodes = (validUnits as any[]).map(u => u.kode_unit);
            const validCodesLower = validCodes.map(c => c.toLowerCase());
            
            const invalidFound = (distinctUnits as any[]).find(r => {
              if (!r.val) return false;
              const lowerVal = r.val.toString().trim().toLowerCase();
              return !validCodesLower.includes(lowerVal);
            });
            if (invalidFound) {
              console.warn(`Peringatan: Ditemukan unit '${invalidFound.val}' yang tidak terdaftar di sys_units. Dataset tetap diaktifkan, namun data untuk unit tersebut mungkin tidak muncul di filter.`);
            }
          }
          
        } catch (e: any) {
           throw new Error(`Validasi gagal: ${e.message}`);
        }
      }
      
      await connection.beginTransaction();
      
      await connection.query('SELECT id FROM sys_datasets WHERE is_active = 1 FOR UPDATE');
      await connection.query('UPDATE sys_datasets SET is_active = 0 WHERE is_active = 1');
      
      const mappingStr = columnMapping ? (typeof columnMapping === 'string' ? columnMapping : JSON.stringify(columnMapping)) : targetDataset.column_mapping;
      
      await connection.query(`
        UPDATE sys_datasets 
        SET is_active = 1, activated_by = ?, activated_at = NOW(), column_mapping = ?, status = 'ACTIVE'
        WHERE id = ?
      `, [user.username, mappingStr, id]);
      
      await connection.commit();
      
      return ApiResponse.success(null, 'Dataset berhasil diaktifkan secara transaksional');
    } catch (e: any) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
    
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Error activating dataset', error, 500);
  }
});
