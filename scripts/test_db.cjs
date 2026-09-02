const mysql = require('mysql2/promise');
async function test() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'sidata',
      password: 'password',
      database: 'data_migration'
    });
    console.log('Connection successful!');
    const [rows] = await conn.query('SELECT user, host, plugin FROM mysql.user');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}
test();
