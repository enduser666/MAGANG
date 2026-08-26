const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({path: '.env.local'});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Create sys_units
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        kode_unit VARCHAR(50) NOT NULL UNIQUE,
        nama_unit VARCHAR(255) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2. Create sys_users
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sys_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        unit_id INT NULL,
        role VARCHAR(50) NOT NULL,
        access_scope VARCHAR(50) NOT NULL DEFAULT 'OWN_UNIT',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_sys_users_unit FOREIGN KEY (unit_id) REFERENCES sys_units(id) ON DELETE SET NULL
      )
    `);

    // 3. Alter LHP
    const [lhpCols] = await conn.query("SHOW COLUMNS FROM lhp LIKE 'unit_id'");
    if (lhpCols.length === 0) {
      await conn.query(`ALTER TABLE lhp ADD COLUMN unit_id INT NULL`);
      await conn.query(`ALTER TABLE lhp ADD CONSTRAINT fk_lhp_unit FOREIGN KEY (unit_id) REFERENCES sys_units(id) ON DELETE SET NULL`);
    }

    // 4. Seed sys_units
    const units = [
      ['ITJEN', 'Inspektorat Jenderal'],
      ['DJKN', 'Direktorat Jenderal Kekayaan Negara'],
      ['DJP', 'Direktorat Jenderal Pajak'],
      ['DJBC', 'Direktorat Jenderal Bea dan Cukai'],
      ['DJA', 'Direktorat Jenderal Anggaran'],
      ['DJPB', 'Direktorat Jenderal Perbendaharaan'],
      ['DJPK', 'Direktorat Jenderal Perimbangan Keuangan'],
      ['BPPK', 'Badan Pendidikan dan Pelatihan Keuangan'],
      ['DJPPR', 'Direktorat Jenderal Pengelolaan Pembiayaan dan Risiko'],
      ['BKF', 'Badan Kebijakan Fiskal'],
      ['SETJEN', 'Sekretariat Jenderal']
    ];
    
    // Check if empty
    const [[{c: unitCount}]] = await conn.query('SELECT COUNT(*) AS c FROM sys_units');
    if (unitCount === 0) {
      await conn.query('INSERT INTO sys_units (kode_unit, nama_unit) VALUES ?', [units]);
    }

    // 5. Seed sys_users
    const defaultPassword = hashPassword('password123'); // standard initial password
    
    // Fetch units to get their IDs
    const [unitRows] = await conn.query('SELECT id, kode_unit FROM sys_units');
    const unitMap = {};
    for(const u of unitRows) {
        unitMap[u.kode_unit] = u.id;
    }

    const users = [
      ['admin.itjen', defaultPassword, unitMap['ITJEN'], 'ADMIN_PUSAT', 'ALL_UNITS'],
      ['admin.djkn', defaultPassword, unitMap['DJKN'], 'ADMIN_UNIT', 'OWN_UNIT'],
      ['viewer.djkn', defaultPassword, unitMap['DJKN'], 'VIEWER', 'OWN_UNIT'],
      ['admin.djp', defaultPassword, unitMap['DJP'], 'ADMIN_UNIT', 'OWN_UNIT'],
      ['admin.djbc', defaultPassword, unitMap['DJBC'], 'ADMIN_UNIT', 'OWN_UNIT']
    ];

    const [[{c: userCount}]] = await conn.query('SELECT COUNT(*) AS c FROM sys_users');
    if (userCount === 0) {
      await conn.query('INSERT INTO sys_users (username, password_hash, unit_id, role, access_scope) VALUES ?', [users]);
    }

    // 6. Update existing LHP to prevent orphans
    await conn.query('UPDATE lhp SET unit_id = ? WHERE unit_id IS NULL', [unitMap['ITJEN']]);

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Migration Phase 1 Completed!');
    
    // Log structural verifications
    const [lhp_desc] = await conn.query('DESCRIBE lhp');
    console.log('LHP Schema:', lhp_desc.find(c => c.Field === 'unit_id'));
    
    const [[{uc}]] = await conn.query('SELECT COUNT(*) AS uc FROM sys_units');
    const [[{usr}]] = await conn.query('SELECT COUNT(*) AS usr FROM sys_users');
    console.log(`Units seeded: ${uc}, Users seeded: ${usr}`);
    
    const [lhpCheck] = await conn.query('SELECT COUNT(*) AS c FROM lhp WHERE unit_id IS NULL');
    console.log(`LHP with NULL unit_id (Orphans): ${lhpCheck[0].c}`);

  } catch(e) {
    console.error('FAILED:', e.message);
  } finally {
    await conn.end();
  }
}
run();
