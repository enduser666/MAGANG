const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'localhost', user:'root', database:'sidata_test'});
  const [rows] = await conn.query(`
    SELECT
        u.id,
        u.username,
        u.role,
        u.access_scope,
        u.unit_id,
        un.kode_unit,
        u.is_active
    FROM sys_users u
    LEFT JOIN sys_units un
        ON un.id = u.unit_id
    ORDER BY u.id;
  `);
  console.table(rows);
  conn.end();
}
run();
