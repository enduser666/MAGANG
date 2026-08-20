const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ''
  });

  console.log("Connected to MySQL server.");
  
  await connection.query(`DROP DATABASE IF EXISTS sidata_test;`);
  await connection.query(`CREATE DATABASE sidata_test;`);
  console.log("Database sidata_test created/verified.");
  
  await connection.query(`USE sidata_test;`);

  await connection.query(`
    CREATE TABLE lhp (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nomor_lhp VARCHAR(255) NOT NULL,
      instansi VARCHAR(255) NOT NULL,
      tanggal DATE NOT NULL,
      status ENUM('Selesai', 'Proses', 'Belum Selesai') DEFAULT 'Proses'
    );
  `);
  console.log("Table lhp created.");

  await connection.query(`
    CREATE TABLE temuan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      id_lhp INT NOT NULL,
      uraian TEXT NOT NULL,
      nilai DECIMAL(15,2) DEFAULT 0,
      is_high_risk TINYINT(1) DEFAULT 0
    );
  `);
  console.log("Table temuan created.");

  await connection.query(`
    CREATE TABLE rekomendasi (
      id INT AUTO_INCREMENT PRIMARY KEY,
      id_temuan INT NOT NULL,
      uraian TEXT NOT NULL,
      status ENUM('Selesai', 'Belum Ditindaklanjuti', 'Dalam Proses') DEFAULT 'Belum Ditindaklanjuti'
    );
  `);
  console.log("Table rekomendasi created.");

  // Insert some seed data
  await connection.query(`INSERT INTO lhp (nomor_lhp, instansi, tanggal, status) VALUES ('LHP-001', 'Kemenkeu', '2025-01-01', 'Selesai')`);
  await connection.query(`INSERT INTO temuan (id_lhp, uraian, nilai, is_high_risk) VALUES (1, 'Temuan Pajak 001', 5000000, 1)`);
  await connection.query(`INSERT INTO rekomendasi (id_temuan, uraian, status) VALUES (1, 'Tindak lanjut pajak', 'Belum Ditindaklanjuti')`);
  console.log("Seed data inserted.");

  await connection.end();
}

main().catch(console.error);
