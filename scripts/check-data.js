const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'sidata_test' });
  const [rows] = await pool.query("SELECT final_type, final_status, COUNT(*) as count FROM ( SELECT kode_rek, MAX(jenis_pemeriksaan) as final_type, MAX(status_rekomendasi) as final_status FROM rekap_rekomendasi_minimize__2_ GROUP BY kode_rek ) t GROUP BY final_type, final_status");
  console.log(rows);
  process.exit(0);
}
run();
