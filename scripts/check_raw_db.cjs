// check_raw_db.cjs
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'sidata_test' });
  const [dsRows] = await conn.query("SELECT dataset_name, table_name, column_mapping FROM sys_datasets WHERE dataset_name = 'rekap_minimize_new' LIMIT 1");
  if (dsRows.length === 0) {
      console.log('Dataset not found');
      return;
  }
  
  const ds = dsRows[0];
  const mapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
  console.log('MAPPING:', mapping);
  
  const tableName = ds.table_name || 'rekap_minimize_new'; // or whatever
  
  // Resolve col helper
  const resolveCol = (mappingField) => {
      if (!mappingField) return null;
      if (typeof mappingField === 'string') return mappingField;
      if (typeof mappingField === 'object' && mappingField.column) return mappingField.column;
      return null;
  };
  
  const fCol = resolveCol(mapping.finding);
  const typeCol = resolveCol(mapping.finding_type) || resolveCol(mapping.jenis_pemeriksaan);
  const sCol = resolveCol(mapping.status);
  const uCol = resolveCol(mapping.unit) || resolveCol(mapping.unit_access_control);
  
  console.log('Resolved Columns:', { finding: fCol, finding_type: typeCol, status: sCol, unit: uCol });
  
  if (fCol && typeCol && sCol) {
      const q = `
        SELECT final_type, final_status, COUNT(*) as count
        FROM (
          SELECT \`${fCol}\`, MAX(\`${typeCol}\`) as final_type, MAX(\`${sCol}\`) as final_status
          FROM \`${tableName}\`
          GROUP BY \`${fCol}\`
        ) t
        GROUP BY final_type, final_status
      `;
      try {
          const [res] = await conn.query(q);
          console.log('Jenis Pemeriksaan Data:', res);
      } catch(e) { console.error(e); }
  }
  
  if (fCol && uCol) {
      const q = `
        SELECT final_unit, COUNT(*) as count
        FROM (
          SELECT \`${fCol}\`, MAX(\`${uCol}\`) as final_unit
          FROM \`${tableName}\`
          GROUP BY \`${fCol}\`
        ) t
        GROUP BY final_unit
      `;
      try {
          const [res] = await conn.query(q);
          console.log('Unit in Charge Data:', res);
      } catch(e) { console.error(e); }
  }
  
  conn.end();
}
run().catch(console.error);
