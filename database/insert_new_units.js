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
  
  const newUnits = [
    { kode: 'LNSW', nama: 'Lembaga National Single Window' },
    { kode: 'DJSEF', nama: 'Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko' }, // usually DJPPR but they use DJSEF maybe
    { kode: 'LMAN', nama: 'Lembaga Manajemen Aset Negara' },
    { kode: 'LPDP', nama: 'Lembaga Pengelola Dana Pendidikan' },
    { kode: 'BPDP', nama: 'Badan Pengelola Dana Perkebunan Kelapa Sawit' },
    { kode: 'BPDLH', nama: 'Badan Pengelola Dana Lingkungan Hidup' },
    { kode: 'LDKPI', nama: 'Lembaga Dana Kerja Sama Pembangunan Internasional' },
    { kode: 'KL Lain', nama: 'Kementerian/Lembaga Lainnya' }
  ];
  
  for (const u of newUnits) {
     const [rows] = await conn.query('SELECT * FROM sys_units WHERE kode_unit = ?', [u.kode]);
     if (rows.length === 0) {
        await conn.query('INSERT INTO sys_units (kode_unit, nama_unit, is_active) VALUES (?, ?, 1)', [u.kode, u.nama]);
        console.log(`Inserted ${u.kode}`);
     } else {
        console.log(`${u.kode} already exists`);
     }
  }
  
  await conn.end();
}
run().catch(console.error);
