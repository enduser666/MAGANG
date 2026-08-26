import { getDbClient } from '@/db';
import { withAuth } from '@/backend/lib/auth';
import { mapJenisPemeriksaan, JENIS_PEMERIKSAAN_CATEGORIES } from '@/backend/lib/jenisMapper';

export const GET = withAuth(async (request, user) => {
  const startTime = Date.now();
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig) as any;

    const defaultEmptyData = JENIS_PEMERIKSAAN_CATEGORIES.map(name => ({ name, Temuan: 0 }));

    if (dbType === 'sandbox' && db.isMock) {
      return Response.json({ success: true, schemaReady: false, data: defaultEmptyData });
    }

    const { searchParams } = new URL(request.url);
    
    let datasetMode = 'LEGACY_RELATIONAL';
    let targetTable = 'lhp';
    let columnMapping: any = null;
    let unitColumn = 'unit_id';

    let datasetId: string | null = null;
    let datasetName: string | null = null;

    if (db.pool) {
       const [rows] = await db.pool.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
       if (rows.length > 0) {
          const ds = rows[0];
          datasetId = ds.id;
          datasetName = ds.dataset_name;
          datasetMode = ds.dataset_mode;
          targetTable = ds.table_name || targetTable;
          columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
          
          if (datasetMode === 'DYNAMIC_FLAT_TABLE' && columnMapping && columnMapping.unit) {
            unitColumn = columnMapping.unit.column;
          }
       }
    }

    if (datasetMode === 'DYNAMIC_FLAT_TABLE' && (!columnMapping || !columnMapping.finding_type || !columnMapping.finding_type.column || !columnMapping.finding || !columnMapping.finding.column)) {
       return Response.json({ success: true, schemaReady: true, data: defaultEmptyData, unknownCount: 0 });
    }

    let targetUnitVal: string | null = null;
    
    if (user.accessScope === 'OWN_UNIT' && user.unitId) {
      if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
         targetUnitVal = user.unitKode || null;
      } else {
         targetUnitVal = String(user.unitId);
      }
    } else if (user.accessScope === 'ALL_UNITS') {
      const clientUnit = searchParams.get('unit_id');
      if (clientUnit && clientUnit !== 'all') {
         let validatedUnitVal = clientUnit;
         if (db.pool) {
            const [uRows] = await db.pool.query('SELECT id, kode_unit FROM sys_units WHERE id = ? OR kode_unit = ? LIMIT 1', [clientUnit, clientUnit]);
            if (uRows.length > 0) {
               if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
                  validatedUnitVal = uRows[0].kode_unit;
               } else {
                  validatedUnitVal = uRows[0].id;
               }
            }
         }
         targetUnitVal = validatedUnitVal;
      }
    }

    let sql = '';
    const params: any[] = [];
    
    if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
       const findingCol = columnMapping.finding.column;
       const typeCol = columnMapping.finding_type.column;
       
       let wClause = '';
       if (targetUnitVal) {
          wClause = ` WHERE \`${unitColumn}\` = ? `;
          params.push(targetUnitVal);
       }
       
       sql = `
         SELECT final_type as jenis_pemeriksaan, COUNT(*) AS jumlah_temuan 
         FROM (
             SELECT \`${findingCol}\`, MAX(\`${typeCol}\`) as final_type
             FROM \`${targetTable}\`
             ${wClause}
             GROUP BY \`${findingCol}\`
         ) t
         GROUP BY final_type
       `;
    } else {
       sql = `
         SELECT 
             l.jenis_pemeriksaan, 
             COUNT(t.id) AS jumlah_temuan 
         FROM lhp l 
         LEFT JOIN temuan t 
             ON t.id_lhp = l.id 
       `;
       if (targetUnitVal) {
         sql += ` WHERE l.unit_id = ? `;
         params.push(targetUnitVal);
       }
       sql += ` GROUP BY l.jenis_pemeriksaan`;
    }

    try {
      const rows = await db.executeRawUnsafe(sql, params);
      
      if (datasetMode === 'DYNAMIC_FLAT_TABLE') {
         const data = (rows as any[]).map(r => ({
            name: String(r.jenis_pemeriksaan || 'Lainnya'),
            Temuan: Number(r.jumlah_temuan) || 0
         }));
         
         if (db.pool && datasetId) {
             console.log('==============================');
             console.log('Logging Sementara (Temuan Jenis)');
             console.log('==============================');
             console.log('Endpoint:', request.url);
             console.log('Dataset:', datasetName || datasetId);
             console.log('Mode:', datasetMode);
             console.log('Table:', targetTable);
             console.log('Column Mapping Keys:', columnMapping ? Object.keys(columnMapping) : 'None');
             console.log('SQL:', sql);
             console.log('Rows (Result):', data.length);
             console.log('Execution Time:', `${Date.now() - startTime}ms`);
             console.log('==============================');
         }

         return Response.json({ success: true, schemaReady: true, data, unknownCount: 0 });
      }
      
      let unknownCount = 0;
      let unmappedStatuses = new Set<string>();
      
      const counts: Record<string, number> = {
        'Kinerja/PDTT': 0,
        'LKPP': 0,
        'LKBUN': 0,
        'LKBA015': 0
      };

      for (const row of rows) {
        const category = mapJenisPemeriksaan(row.jenis_pemeriksaan);
        const jumlah = Number(row.jumlah_temuan) || 0;
        
        if (category === 'unknown') {
          unknownCount += jumlah;
          if (row.jenis_pemeriksaan) {
            unmappedStatuses.add(String(row.jenis_pemeriksaan));
          }
        } else {
          counts[category] += jumlah;
        }
      }

      const data = JENIS_PEMERIKSAAN_CATEGORIES.map(name => ({
        name,
        Temuan: counts[name]
      }));

      if (db.pool && datasetId) {
          console.log('==============================');
          console.log('Logging Sementara (Temuan Jenis)');
          console.log('==============================');
          console.log('Endpoint:', request.url);
          console.log('Dataset:', datasetName || datasetId);
          console.log('Mode:', datasetMode);
          console.log('Table:', targetTable);
          console.log('Column Mapping Keys:', columnMapping ? Object.keys(columnMapping) : 'None');
          console.log('SQL:', sql);
          console.log('Rows (Result):', data.length);
          console.log('Execution Time:', `${Date.now() - startTime}ms`);
          console.log('==============================');
      }

      return Response.json({ success: true, schemaReady: true, data, unknownCount });
      
    } catch (dbError: any) {
      if (dbError.code === 'ER_BAD_FIELD_ERROR') {
        return Response.json({ success: true, schemaReady: false, data: defaultEmptyData });
      }
      throw dbError;
    }
  } catch (error: any) {
    return Response.json(
      { success: false, message: error.message || 'Failed to fetch temuan per jenis pemeriksaan.' },
      { status: 500 }
    );
  }
});
