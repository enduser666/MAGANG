import { MySQLAdapter } from './src/db/adapters/MySQLAdapter';
import * as dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: '.env.local' });

async function verify() {
  const adapter = new MySQLAdapter();
  
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  });
  
  const [rows] = await db.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
  if ((rows as any[]).length === 0) {
      console.log('No active dataset found.');
      return;
  }
  
  const ds = (rows as any[])[0];
  const mapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
  
  console.log('Target Table:', ds.table_name);
  console.log('Testing getTableAnalytics...');
  
  const data = await adapter.getTableAnalytics(ds.table_name, undefined, 'DYNAMIC_FLAT_TABLE', mapping);
  console.log(JSON.stringify(data.diagnosticLogs, null, 2));
  
  console.log('Testing temuan-jenis logic...');
  const typeCol = mapping.finding_type.column;
  const fCol = mapping.finding.column;
  const [typeRows] = await db.query(`
    SELECT final_type, COUNT(*) as count
    FROM (
        SELECT \`${fCol}\`, MAX(\`${typeCol}\`) as final_type
        FROM \`${ds.table_name}\`
        GROUP BY \`${fCol}\`
    ) t
    GROUP BY final_type
  `);
  console.log('Jenis Pemeriksaan Totals:');
  console.log(typeRows);
  
  await db.end();
  process.exit(0);
}
verify().catch(console.error);
