const mysql = require('mysql2/promise');

async function audit() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'sidata_test',
    port: 3306
  });

  try {
    const [rows] = await connection.query('SELECT * FROM sys_units');
    console.log("=== TABLE sys_units ===");
    console.table(rows);
    console.log("TOTAL ROWS:", rows.length);

    const [columns] = await connection.query('SHOW COLUMNS FROM sys_units');
    console.log("\\n=== COLUMNS sys_units ===");
    console.table(columns.map(c => ({ Field: c.Field, Type: c.Type })));

  } catch (error) {
    console.error("Error connecting to DB:", error);
  } finally {
    await connection.end();
  }
}

audit();
