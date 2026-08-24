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
  
  const [rows] = await conn.query('SELECT nilai_rekomendasi FROM rekap_rekomendasi_minimize__2_ WHERE nilai_rekomendasi IS NOT NULL AND nilai_rekomendasi != 0 LIMIT 10');
  console.log('Sample nilai_rekomendasi:', rows);
  
  const [sumResult] = await conn.query('SELECT SUM(nilai_rekomendasi) as total FROM rekap_rekomendasi_minimize__2_');
  console.log('Total SUM in database:', sumResult[0].total);
  
  await conn.end();
}
run().catch(console.error);
