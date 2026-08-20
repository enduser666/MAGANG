const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function runTest() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  const [rows] = await db.query('SELECT * FROM sys_datasets WHERE is_active = 1 LIMIT 1');
  const ds = rows[0];
  
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

  let totalLhp = 0, totalFindings = 0, totalRekomendasi = 0, totalRekomendasiNilai = null;
  let selesaiCount = null, prosesCount = null, belumCount = null;
  let trendData = [];

  const [lhp] = await db.query(`SELECT COUNT(DISTINCT \`${columnMapping.lhp.column}\`) as total FROM \`${targetTable}\``);
  totalLhp = lhp[0].total;

  const [temuan] = await db.query(`SELECT COUNT(DISTINCT \`${columnMapping.finding.column}\`) as total FROM \`${targetTable}\``);
  totalFindings = temuan[0].total;

  const [rekomendasi] = await db.query(`SELECT COUNT(DISTINCT \`${columnMapping.recommendation.column}\`) as total FROM \`${targetTable}\``);
  totalRekomendasi = rekomendasi[0].total;

  const [rVal] = await db.query(`SELECT SUM(CAST(\`${columnMapping.recommendation_value.column}\` AS DECIMAL(20,2))) as total FROM \`${targetTable}\``);
  totalRekomendasiNilai = rVal[0].total;

  const completedVals = columnMapping.status.completed_values;
  const placeholders = completedVals.map(() => '?').join(',');
  const countQuery = `SELECT 
    COUNT(CASE WHEN \`${columnMapping.status.column}\` IN (${placeholders}) THEN 1 END) as selesai,
    COUNT(CASE WHEN \`${columnMapping.status.column}\` NOT IN (${placeholders}) THEN 1 END) as proses
  FROM \`${targetTable}\``;
  const qParams = [...completedVals, ...completedVals];
  const [stRows] = await db.query(countQuery, qParams);
  selesaiCount = stRows[0].selesai;
  prosesCount = stRows[0].proses;
  belumCount = 0;

  const periodCol = columnMapping.period.column;
  const findingCol = columnMapping.finding.column;
  const [trendRows] = await db.query(`SELECT \`${periodCol}\` as period_name, COUNT(DISTINCT \`${findingCol}\`) as Temuan FROM \`${targetTable}\` GROUP BY \`${periodCol}\` ORDER BY \`${periodCol}\` ASC LIMIT 20`);
  trendData = trendRows.map(r => ({ name: String(r.period_name).substring(0, 15), Temuan: Number(r.Temuan) }));

  const data = {
    totalRecords: totalRekomendasi,
    totalLhp, totalFindings, totalRekomendasi, totalRekomendasiNilai,
    statusDistribution: { selesai: selesaiCount, proses: prosesCount, belum: belumCount },
    trendData, topUnits: []
  };
  
  console.log('KPI Results:', JSON.stringify(data, null, 2));
  console.log('-----------------------------');
  
  process.exit(0);
}
runTest().catch(console.error);
