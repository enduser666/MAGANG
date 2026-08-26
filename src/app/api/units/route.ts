import { NextResponse } from 'next/server';
import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';

export const GET = withAuth(async (request, user) => {
  try {
    if (user.accessScope === 'OWN_UNIT') {
      const dbType = request.headers.get('x-db-type') || 'sandbox';
      const dbConfig = request.headers.get('x-db-config');
      const db = getDbClient(dbType, dbConfig);
      
      return ApiResponse.success([
        { id: user.unitId, kode_unit: user.unitKode, nama_unit: user.unitKode }
      ], 'Units fetched successfully');
    }

    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    let rows: any[] = [];
    if (dbType === 'sandbox') {
      try {
        const unitsRes = await db.findRecords('sys_units');
        rows = unitsRes.data;
      } catch(e) {
        // Fallback to static list if sys_units table doesn't exist in sandbox_db.json yet
        rows = [
          { id: 1, kode_unit: 'ITJEN', nama_unit: 'Inspektorat Jenderal' },
          { id: 2, kode_unit: 'DJKN', nama_unit: 'Direktorat Jenderal Kekayaan Negara' },
          { id: 3, kode_unit: 'DJP', nama_unit: 'Direktorat Jenderal Pajak' },
          { id: 4, kode_unit: 'DJBC', nama_unit: 'Direktorat Jenderal Bea dan Cukai' },
          { id: 5, kode_unit: 'DJA', nama_unit: 'Direktorat Jenderal Anggaran' },
          { id: 6, kode_unit: 'DJPB', nama_unit: 'Direktorat Jenderal Perbendaharaan' },
          { id: 7, kode_unit: 'DJPK', nama_unit: 'Direktorat Jenderal Perimbangan Keuangan' },
          { id: 8, kode_unit: 'BPPK', nama_unit: 'Badan Pendidikan dan Pelatihan Keuangan' },
          { id: 9, kode_unit: 'DJPPR', nama_unit: 'Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko' },
          { id: 10, kode_unit: 'BKF', nama_unit: 'Badan Kebijakan Fiskal' },
          { id: 11, kode_unit: 'SETJEN', nama_unit: 'Sekretariat Jenderal' }
        ];
      }
    } else {
      rows = await db.executeRawUnsafe(`SELECT id, kode_unit, nama_unit FROM sys_units WHERE is_active = 1 ORDER BY id ASC`);
    }

    return ApiResponse.success(rows, 'Units fetched successfully');
  } catch (error: any) {
    return ApiResponse.error(error.message || 'Failed to fetch units.', error, 500);
  }
});
