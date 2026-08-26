const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function runAudit() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  const [rows] = await db.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
  const ds = rows[0];
  const mapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
  
  const findingCol = mapping.finding.column;
  const typeCol = mapping.finding_type.column;
  const periodCol = mapping.period.column;

  console.log('--- AUDIT MULTI-TYPE FINDINGS ---');
  const [dupType] = await db.query(`
    SELECT \`${findingCol}\`, COUNT(DISTINCT \`${typeCol}\`) as total_type 
    FROM \`${ds.table_name}\` 
    GROUP BY \`${findingCol}\` 
    HAVING COUNT(DISTINCT \`${typeCol}\`) > 1
  `);
  console.log('Findings with multiple types (Count):', dupType.length);
  if (dupType.length > 0) {
      console.log('Example data:', dupType.slice(0, 3));
  }

  await db.end();
}
runAudit().catch(console.error);
