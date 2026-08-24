const { getDbClient } = require('./src/db');
async function test() {
  const db = getDbClient('mysql');
  const sql = "SELECT final_type as jenis_pemeriksaan, COUNT(*) AS jumlah_temuan FROM (SELECT no_temuan, MAX(jenis_pemeriksaan) as final_type FROM dim_temuan_dummy GROUP BY no_temuan) t GROUP BY final_type";
  const r = await db.executeRawUnsafe(sql);
  console.log(r);
  process.exit(0);
}
test();
