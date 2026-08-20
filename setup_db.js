const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env.local'});

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });
    
    console.log('Altering ENUM...');
    await conn.query("ALTER TABLE rekomendasi MODIFY COLUMN status VARCHAR(255) DEFAULT 'Dalam Proses'");
    console.log('Altered table to VARCHAR.');
    
    console.log('Inserting test data...');
    await conn.query(`
      INSERT INTO rekomendasi (id_temuan, uraian, status) VALUES 
      (1, 'Test Sesuai Usul', 'Sesuai Usul'), 
      (1, 'Test Sesuai TPTD', 'Sesuai TPTD'), 
      (1, 'Test Usul TPTD', 'Usul TPTD'), 
      (1, 'Test Dalam Proses', 'Dalam Proses'), 
      (1, 'Test Belum TL', 'Belum TL'), 
      (1, 'Test Sesuai_Usul_variation', 'SESUAI_USUL'),
      (1, 'Test Unknown', 'Unmapped Data')
    `);
    
    const [res] = await conn.query('SELECT status, COUNT(*) AS jumlah FROM rekomendasi GROUP BY status ORDER BY status');
    console.log('Distribution:');
    console.table(res);
    
    await conn.end();
  } catch(e) {
    console.error('FAILED:', e.message);
  }
}

run();
