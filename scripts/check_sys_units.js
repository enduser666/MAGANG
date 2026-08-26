const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const [rows] = await conn.query('SELECT * FROM sys_units');
  console.log('sys_units:', rows.map(r => r.kode_unit));
  
  await conn.end();
}
run().catch(console.error);
