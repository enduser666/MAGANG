import { getDbClient } from './src/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function audit() {
  const db = getDbClient('sandbox', null) as any;
  if (!db.pool) {
    console.error("No DB pool");
    return;
  }
  
  // 1. Audit Dataset Aktif
  const [dsRows] = await db.pool.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
  if (dsRows.length === 0) {
    console.log("Tidak ada dataset aktif.");
    process.exit(1);
  }
  const ds = dsRows[0];
  const mapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
  
  console.log("Dataset aktif:", ds.dataset_name);
  console.log("Table:", ds.table_name);
  console.log("Mode:", ds.dataset_mode);
  
  const resolveCol = (mappingField: any) => {
    if (!mappingField) return null;
    if (typeof mappingField === 'string') return mappingField;
    if (typeof mappingField === 'object' && mappingField.column) return mappingField.column;
    return null;
  };
  
  const findingCol = resolveCol(mapping.finding);
  const recCol = resolveCol(mapping.recommendation);
  const statusCol = resolveCol(mapping.status);
  const typeCol = resolveCol(mapping.finding_type) || resolveCol(mapping.jenis_pemeriksaan);
  const unitCol = resolveCol(mapping.unit) || resolveCol(mapping.unit_access_control);
  
  console.log("Finding column:", findingCol);
  console.log("Recommendation column:", recCol);
  console.log("Status column:", statusCol);
  console.log("Finding Type column:", typeCol);
  console.log("Unit column:", unitCol);
  console.log("\n----------------------------------\n");
  
  if (!typeCol || !statusCol) {
    console.log("Missing typeCol or statusCol, aborting raw query audit.");
    process.exit(1);
  }

  // 2. Audit data mentah
  const entityCol = recCol || findingCol;
  
  const typeQuery = `
    SELECT final_type, final_status, COUNT(*) as jumlah
    FROM (
      SELECT \`${entityCol}\`, MAX(\`${typeCol}\`) as final_type, MAX(\`${statusCol}\`) as final_status
      FROM \`${ds.table_name}\`
      GROUP BY \`${entityCol}\`
    ) t
    GROUP BY final_type, final_status
    ORDER BY final_type, final_status;
  `;
  
  const [rawRows] = await db.pool.query(typeQuery);
  console.log("Raw SQL Query Results:");
  console.table(rawRows);
  console.log("\n----------------------------------\n");

  // 3. Unique Values
  const [uniqueTypes] = await db.pool.query(`SELECT DISTINCT \`${typeCol}\` as val FROM \`${ds.table_name}\` WHERE \`${typeCol}\` IS NOT NULL`);
  console.log("Unique Jenis Pemeriksaan:");
  uniqueTypes.forEach((r: any) => console.log(`- "${r.val}"`));
  
  const [uniqueStatuses] = await db.pool.query(`SELECT DISTINCT \`${statusCol}\` as val FROM \`${ds.table_name}\` WHERE \`${statusCol}\` IS NOT NULL`);
  console.log("\nUnique Status Rekomendasi:");
  uniqueStatuses.forEach((r: any) => console.log(`- "${r.val}"`));
  console.log("\n----------------------------------\n");

  // 4 & 5. Audit Agregasi Business Rule
  const groupStatus = (rawStatus: string): 'tuntas' | 'dalamProses' => {
     if (!rawStatus) return 'dalamProses';
     const norm = String(rawStatus).trim().toLowerCase();
     if (['sesuai', 'tptd', 'diusulkan sesuai', 'diusulkan tptd'].includes(norm)) return 'tuntas';
     return 'dalamProses';
  };

  const grouped: Record<string, any> = {};
  rawRows.forEach((r: any) => {
    const t = r.final_type || 'Unknown';
    const rawS = r.final_status || 'Unknown';
    const gStatus = groupStatus(rawS);
    
    if (!grouped[t]) grouped[t] = { jenis: t, tuntas: 0, dalamProses: 0, total: 0 };
    
    if (gStatus === 'tuntas') {
       grouped[t].tuntas += Number(r.jumlah);
    } else {
       grouped[t].dalamProses += Number(r.jumlah);
    }
    grouped[t].total += Number(r.jumlah);
  });
  
  console.log("Agregasi Akhir (jenisData):");
  const jenisData = Object.values(grouped).sort((a: any, b: any) => b.total - a.total);
  console.log(JSON.stringify(jenisData, null, 2));

  console.log("\n----------------------------------\n");
  console.log("Validasi Akhir (Tuntas + Dalam Proses = Total):");
  jenisData.forEach((item: any) => {
    const sum = item.tuntas + item.dalamProses;
    const isOk = sum === item.total ? 'PASS' : 'FAIL';
    console.log(`[${isOk}] ${item.jenis}: Tuntas ${item.tuntas} + Proses ${item.dalamProses} = Total ${item.total} (Expected: ${item.total})`);
  });

  process.exit(0);
}

audit().catch(console.error);
