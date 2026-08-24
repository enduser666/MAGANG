import { MySQLAdapter } from './src/db/adapters/MySQLAdapter';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runTest() {
  const adapter = new MySQLAdapter();
  
  // Wait for pool to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const [rows] = await (adapter as any).pool.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
  const ds = (rows as any)[0];
  
  const datasetId = ds.id;
  const datasetName = ds.dataset_name;
  const datasetMode = ds.dataset_mode;
  const targetTable = ds.table_name;
  const columnMapping = typeof ds.column_mapping === 'string' ? JSON.parse(ds.column_mapping) : ds.column_mapping;
  
  console.log('--- BACKEND ANALYTICS LOG ---');
  console.log('Dataset ID:', datasetId);
  console.log('Dataset Name:', datasetName);
  console.log('Dataset Mode:', datasetMode);
  console.log('Table Name:', targetTable);
  console.log('Column Mapping:', JSON.stringify(columnMapping, null, 2));
  console.log('Query Mode:', datasetMode === 'DYNAMIC_FLAT_TABLE' ? 'Dynamic' : 'Legacy');

  const data = await adapter.getTableAnalytics(targetTable, undefined, datasetMode, columnMapping);
  
  console.log('KPI Results:', JSON.stringify(data, null, 2));
  console.log('-----------------------------');

  // Manual Raw SQL queries for verification
  console.log('\n--- RAW SQL VERIFICATION ---');
  const [lhp] = await (adapter as any).pool.query(`SELECT COUNT(DISTINCT \`${columnMapping.lhp.column}\`) as c FROM \`${targetTable}\``);
  const [temuan] = await (adapter as any).pool.query(`SELECT COUNT(DISTINCT \`${columnMapping.finding.column}\`) as c FROM \`${targetTable}\``);
  const [rekomendasi] = await (adapter as any).pool.query(`SELECT COUNT(*) as c FROM \`${targetTable}\``);
  
  console.log(`Raw LHP Count:`, (lhp as any)[0].c);
  console.log(`Raw Temuan Count:`, (temuan as any)[0].c);
  console.log(`Raw Rekomendasi Count:`, (rekomendasi as any)[0].c);
  
  process.exit(0);
}

runTest().catch(console.error);
