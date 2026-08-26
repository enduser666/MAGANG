const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function verify() {
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
  const table = ds.table_name;
  
  console.log('====================================');
  console.log('RUNTIME SQL VERIFICATION');
  console.log('====================================');
  console.log('Dataset ID:', ds.id);
  console.log('Dataset Name:', ds.dataset_name);
  console.log('Dataset Mode:', ds.dataset_mode);
  console.log('Table Name:', table);
  
  const fCol = mapping.finding.column;
  const typeCol = mapping.finding_type.column;
  const pCol = mapping.period.column;
  const sCol = mapping.status.column;
  const placeholders = (mapping.status.completed_values || []).map(() => '?').join(',');
  const qParams = mapping.status.completed_values || [];
  
  // 1. Executive Total (Distinct Finding)
  const qExec = `SELECT COUNT(DISTINCT \`${fCol}\`) as total FROM \`${table}\``;
  const [rExec] = await db.query(qExec);
  const execTotal = rExec[0].total;
  
  // 2. Pie Chart Total
  let qPie = '';
  let rPie = [];
  if (qParams.length > 0) {
      qPie = `
               SELECT final_status, COUNT(*) as count FROM (
                 SELECT \`${fCol}\`,
                   CASE 
                     WHEN SUM(CASE WHEN \`${sCol}\` NOT IN (${placeholders}) THEN 1 ELSE 0 END) > 0 THEN 'proses'
                     ELSE 'selesai'
                   END as final_status
                 FROM \`${table}\`
                 GROUP BY \`${fCol}\`
               ) t GROUP BY final_status
             `;
      [rPie] = await db.query(qPie, qParams);
  }
  let pieTotal = 0;
  rPie.forEach(r => pieTotal += Number(r.count));
  
  // 3. Bar Chart Total
  const qBar = `
           SELECT final_type, COUNT(*) as count
           FROM (
              SELECT \`${fCol}\`, MAX(\`${typeCol}\`) as final_type
              FROM \`${table}\`
              GROUP BY \`${fCol}\`
           ) t
           GROUP BY final_type
         `;
  const [rBar] = await db.query(qBar);
  let barTotal = 0;
  rBar.forEach(r => barTotal += Number(r.count));
  
  // 4. Trend Total
  const qTrend = `
           SELECT final_period as period_name, COUNT(*) as Temuan
           FROM (
              SELECT \`${fCol}\`, MAX(\`${pCol}\`) as final_period
              FROM \`${table}\`
              GROUP BY \`${fCol}\`
           ) t
           GROUP BY final_period
           ORDER BY final_period ASC LIMIT 20
         `;
  const [rTrend] = await db.query(qTrend);
  let trendTotal = 0;
  rTrend.forEach(r => trendTotal += Number(r.Temuan));

  console.log('\\n--- SQL EXECUTED ---');
  console.log('1. Executive SQL:', qExec);
  console.log('2. Pie Chart SQL:', qPie.trim());
  console.log('3. Bar Chart SQL:', qBar.trim());
  console.log('4. Trend Chart SQL:', qTrend.trim());
  
  console.log('\\n--- TOTALS ---');
  console.log('Executive Total :', execTotal);
  console.log('Pie Total       :', pieTotal);
  console.log('Bar Total       :', barTotal);
  console.log('Trend Total     :', trendTotal);
  
  console.log('\\n--- CONSISTENCY CHECK ---');
  const isConsistent = (execTotal === pieTotal) && (execTotal === barTotal) && (execTotal === trendTotal);
  console.log('Executive == Pie == Bar == Trend :', isConsistent ? 'TRUE' : 'FALSE');
  
  await db.end();
}
verify().catch(console.error);
