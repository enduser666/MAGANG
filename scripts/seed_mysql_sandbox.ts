import fs from 'fs';
import { getDbClient } from '../src/db/index';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const dbPath = 'src/db/sandbox_db.json';
  if (!fs.existsSync(dbPath)) {
    console.error('sandbox_db.json not found!');
    return;
  }

  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const tableData = dbData.tables.temuan_pengawasan;
  
  if (!tableData) {
    console.error('temuan_pengawasan not found in sandbox_db.json!');
    return;
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  });

  console.log('Dropping existing temuan_pengawasan if exists...');
  await pool.query('DROP TABLE IF EXISTS `temuan_pengawasan`');

  console.log('Creating temuan_pengawasan table...');
  const createTableSql = `
    CREATE TABLE \`temuan_pengawasan\` (
      \`id\` INT PRIMARY KEY AUTO_INCREMENT,
      \`finding_id\` VARCHAR(255),
      \`tanggal\` VARCHAR(255),
      \`unit_kerja\` VARCHAR(255),
      \`kategori\` VARCHAR(255),
      \`tingkat_risiko\` VARCHAR(255),
      \`status\` VARCHAR(255),
      \`dampak_finansial\` DOUBLE,
      \`rekomendasi\` TEXT,
      \`temuan_berulang\` VARCHAR(255),
      \`wilayah\` VARCHAR(255),
      \`owner_username\` VARCHAR(255),
      \`created_by\` VARCHAR(255),
      \`updated_by\` VARCHAR(255),
      \`created_at\` VARCHAR(255),
      \`updated_at\` VARCHAR(255),
      \`workflow_status\` VARCHAR(255),
      \`record_version\` INT,
      \`locked_by\` VARCHAR(255),
      \`locked_until\` VARCHAR(255),
      \`approval_status\` VARCHAR(255),
      \`approval_history\` TEXT,
      \`activity_ref\` VARCHAR(255)
    )
  `;
  await pool.query(createTableSql);

  const rows = tableData.rows || [];
  console.log(`Inserting ${rows.length} rows...`);

  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const keys = Object.keys(chunk[0]).filter(k => k !== 'id'); // skip id for auto_increment
    const cols = keys.map(k => `\`${k}\``).join(', ');
    
    let vals: any[] = [];
    const placeholders = chunk.map(row => {
      const rowVals = keys.map(k => {
        let val = row[k];
        if (typeof val === 'object' && val !== null) {
          return JSON.stringify(val);
        }
        return val;
      });
      vals.push(...rowVals);
      return `(${keys.map(() => '?').join(', ')})`;
    }).join(', ');
    
    await pool.query(`INSERT INTO \`temuan_pengawasan\` (${cols}) VALUES ${placeholders}`, vals);
  }

  console.log('Seed completed successfully!');
  await pool.end();
}

main().catch(console.error);
