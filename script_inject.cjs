const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env.local'});

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  try {
    const [[{c: lhpBefore}]] = await conn.query('SELECT COUNT(*) AS c FROM lhp');
    const [[{c: temuanBefore}]] = await conn.query('SELECT COUNT(*) AS c FROM temuan');

    await conn.beginTransaction();

    await conn.query(`UPDATE lhp SET jenis_pemeriksaan = 'Kinerja/PDTT' WHERE id IN (1,3,4,5)`);
    await conn.query(`UPDATE lhp SET jenis_pemeriksaan = 'LKPP' WHERE id IN (6,7,8,9)`);
    await conn.query(`UPDATE lhp SET jenis_pemeriksaan = 'LKBUN' WHERE id IN (10,11,12,13)`);
    await conn.query(`UPDATE lhp SET jenis_pemeriksaan = 'LKBA015' WHERE id IN (14,15,16,17,18)`);

    const values = [
      // Kinerja/PDTT (9 total)
      [3, 'Temuan Kinerja 1', 1000000, 0],
      [3, 'Temuan Kinerja 2', 2000000, 1],
      [3, 'Temuan Kinerja 3', 3000000, 0],
      [4, 'Temuan Kinerja 4', 4000000, 1],
      [4, 'Temuan Kinerja 5', 5000000, 0],
      [4, 'Temuan Kinerja 6', 6000000, 1],
      [5, 'Temuan Kinerja 7', 7000000, 0],
      [5, 'Temuan Kinerja 8', 8000000, 1],
      [5, 'Temuan Kinerja 9', 9000000, 0],

      // LKPP (7 total)
      [6, 'Temuan LKPP 1', 1000000, 0],
      [6, 'Temuan LKPP 2', 2000000, 1],
      [7, 'Temuan LKPP 3', 3000000, 0],
      [7, 'Temuan LKPP 4', 4000000, 1],
      [8, 'Temuan LKPP 5', 5000000, 0],
      [8, 'Temuan LKPP 6', 6000000, 1],
      [9, 'Temuan LKPP 7', 7000000, 0],

      // LKBUN (5 total)
      [10, 'Temuan LKBUN 1', 1000000, 0],
      [10, 'Temuan LKBUN 2', 2000000, 1],
      [11, 'Temuan LKBUN 3', 3000000, 0],
      [11, 'Temuan LKBUN 4', 4000000, 1],
      [12, 'Temuan LKBUN 5', 5000000, 0],

      // LKBA015 (4 total)
      [14, 'Temuan LKBA015 1', 1000000, 0],
      [14, 'Temuan LKBA015 2', 2000000, 1],
      [15, 'Temuan LKBA015 3', 3000000, 0],
      [15, 'Temuan LKBA015 4', 4000000, 1]
    ];

    await conn.query('INSERT INTO temuan (id_lhp, uraian, nilai, is_high_risk) VALUES ?', [values]);

    await conn.commit();
    console.log('Transaction committed!');

    const [[{c: lhpAfter}]] = await conn.query('SELECT COUNT(*) AS c FROM lhp');
    const [[{c: temuanAfter}]] = await conn.query('SELECT COUNT(*) AS c FROM temuan');

    console.log(`LHP: ${lhpBefore} -> ${lhpAfter}`);
    console.log(`TEMUAN: ${temuanBefore} -> ${temuanAfter}`);

    const [agg] = await conn.query(`
      SELECT
          l.jenis_pemeriksaan,
          COUNT(t.id) AS jumlah_temuan
      FROM lhp l
      LEFT JOIN temuan t
          ON t.id_lhp = l.id
      GROUP BY l.jenis_pemeriksaan
      ORDER BY l.jenis_pemeriksaan;
    `);
    console.log('AGREGASI:');
    console.table(agg);

    const [orphans] = await conn.query(`
      SELECT
          t.id,
          t.id_lhp
      FROM temuan t
      LEFT JOIN lhp l
          ON l.id = t.id_lhp
      WHERE l.id IS NULL;
    `);
    console.log('ORPHANS COUNT:', orphans.length);

  } catch(e) {
    await conn.rollback();
    console.error('FAILED & ROLLED BACK:', e.message);
  } finally {
    await conn.end();
  }
}
run();
